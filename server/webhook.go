package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"

	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

func (p *Plugin) handleWebhook(w http.ResponseWriter, r *http.Request) {
	config := p.getConfiguration()
	if config.WebhookSecret == "" {
		p.handleErrorWithCode(w, http.StatusInternalServerError, "Webhook secret not configured", nil)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "Failed to read request body", err)
		return
	}

	// Verify webhook signature — header must be present and valid
	signature := r.Header.Get("X-Zendesk-Webhook-Signature")
	if signature == "" {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Missing webhook signature", nil)
		return
	}
	if !verifyWebhookSignature(body, signature, config.WebhookSecret) {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Invalid webhook signature", nil)
		return
	}

	var event zendesk.WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "Invalid webhook payload", err)
		return
	}

	// Process the webhook event asynchronously with panic recovery
	go func() {
		defer func() {
			if r := recover(); r != nil {
				p.API.LogError("Panic in webhook processing", "panic", fmt.Sprintf("%v", r))
			}
		}()
		p.processWebhookEvent(&event)
	}()

	w.WriteHeader(http.StatusOK)
}

func verifyWebhookSignature(body []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSig))
}

func (p *Plugin) processWebhookEvent(event *zendesk.WebhookEvent) {
	subs, err := p.kvstore.ListSubscriptions()
	if err != nil {
		p.API.LogError("Failed to list subscriptions", "error", err.Error())
		return
	}

	config := p.getConfiguration()

	for _, sub := range subs {
		if !matchesSubscription(sub.GroupFilter, sub.PriorityFilter, sub.EventTypes, event) {
			continue
		}

		attachment := buildTicketAttachment(event, config.GetZendeskURL())
		post := &model.Post{
			UserId:    p.botUserID,
			ChannelId: sub.ChannelID,
		}
		post.AddProp("attachments", []*model.SlackAttachment{attachment})

		if err := p.client.Post.CreatePost(post); err != nil {
			p.API.LogError("Failed to post webhook notification", "channel_id", sub.ChannelID, "error", err.Error())
		}
	}
}

func matchesSubscription(groupFilter, priorityFilter string, eventTypes []string, event *zendesk.WebhookEvent) bool {
	// Check event type filter
	if len(eventTypes) > 0 && !slices.Contains(eventTypes, event.EventType) {
		return false
	}

	// Check group filter
	if groupFilter != "" && !strings.EqualFold(groupFilter, event.GroupName) {
		return false
	}

	// Check priority filter
	if priorityFilter != "" {
		priorities := map[string]int{"low": 1, "normal": 2, "high": 3, "urgent": 4}
		eventPriority := priorities[strings.ToLower(event.Priority)]
		filterPriority := priorities[strings.ToLower(priorityFilter)]
		if eventPriority < filterPriority {
			return false
		}
	}

	return true
}

func buildTicketAttachment(event *zendesk.WebhookEvent, baseURL string) *model.SlackAttachment {
	color := colorByStatus(event.Status)
	eventLabel := formatEventType(event.EventType)

	ticketURL := event.TicketURL
	if ticketURL == "" && event.TicketID != "" {
		ticketURL = fmt.Sprintf("%s/agent/tickets/%s", baseURL, event.TicketID)
	}

	attachment := &model.SlackAttachment{
		Color:     color,
		Fallback:  fmt.Sprintf("[%s] #%s %s", eventLabel, event.TicketID, event.TicketTitle),
		Title:     fmt.Sprintf("[#%s] %s", event.TicketID, event.TicketTitle),
		TitleLink: ticketURL,
		Fields: []*model.SlackAttachmentField{
			{Title: "Event", Value: eventLabel, Short: true},
			{Title: "Status", Value: event.Status, Short: true},
			{Title: "Priority", Value: event.Priority, Short: true},
			{Title: "Assignee", Value: event.AssigneeName, Short: true},
		},
	}

	if event.LatestComment != "" {
		comment := event.LatestComment
		if len(comment) > 300 {
			comment = comment[:300] + "..."
		}
		attachment.Text = comment
	}

	return attachment
}

func colorByStatus(status string) string {
	switch strings.ToLower(status) {
	case "new":
		return "#1f73b7"
	case "open":
		return "#e9ab12"
	case "pending":
		return "#ad5918"
	case "hold":
		return "#8c232c"
	case "solved":
		return "#2e8738"
	case "closed":
		return "#68737d"
	default:
		return "#87929d"
	}
}

func formatEventType(eventType string) string {
	switch eventType {
	case "ticket_created":
		return "Ticket Created"
	case "ticket_updated":
		return "Ticket Updated"
	case "ticket_solved":
		return "Ticket Solved"
	case "ticket_closed":
		return "Ticket Closed"
	case "ticket_commented":
		return "New Comment"
	default:
		return strings.ReplaceAll(eventType, "_", " ")
	}
}
