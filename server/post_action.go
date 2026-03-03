package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"

	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

type createTicketFromPostRequest struct {
	PostID    string `json:"post_id"`
	ChannelID string `json:"channel_id"`
	TriggerID string `json:"trigger_id"`
}

func (p *Plugin) handleCreateTicketFromPost(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var req createTicketFromPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	if req.PostID == "" || req.TriggerID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "post_id and trigger_id are required"})
		return
	}

	// Check that the user is connected to Zendesk
	token, err := p.kvstore.GetOAuthToken(userID)
	if err != nil || token == nil {
		p.API.SendEphemeralPost(userID, &model.Post{
			ChannelId: req.ChannelID,
			UserId:    p.botUserID,
			Message:   "You are not connected to Zendesk. Use `/zendesk connect` first.",
		})
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}

	// Get the post content to pre-fill the dialog
	post, err := p.client.Post.GetPost(req.PostID)
	if err != nil {
		p.API.LogError("Failed to get post", "error", err.Error())
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get post"})
		return
	}

	p.openCreateTicketDialog(req.TriggerID, userID, post.Message)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// createTicketDirectRequest is the request payload for creating a ticket directly (without dialog).
type createTicketDirectRequest struct {
	Subject     string `json:"subject"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	Type        string `json:"type"`
	PostID      string `json:"post_id"`
	ChannelID   string `json:"channel_id"`
	AssigneeID  int64  `json:"assignee_id"`
	RequesterID int64  `json:"requester_id"`
}

// handleCreateTicketDirect creates a Zendesk ticket directly from the webapp modal.
func (p *Plugin) handleCreateTicketDirect(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var req createTicketDirectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	if req.Subject == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Subject is required"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	config := p.getConfiguration()

	ticket, err := zdClient.CreateTicket(&zendesk.TicketCreateRequest{
		Ticket: zendesk.TicketCreateBody{
			Subject:     req.Subject,
			Description: req.Description,
			Priority:    req.Priority,
			Type:        req.Type,
			AssigneeID:  req.AssigneeID,
			RequesterID: req.RequesterID,
		},
	})
	if err != nil {
		p.API.LogError("Failed to create Zendesk ticket", "error", err.Error())
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create ticket: " + err.Error()})
		return
	}

	ticketURL := fmt.Sprintf("%s/agent/tickets/%d", config.GetZendeskURL(), ticket.ID)

	// Post confirmation message in the channel
	if req.ChannelID != "" {
		post := &model.Post{
			UserId:    p.botUserID,
			ChannelId: req.ChannelID,
		}

		fields := []*model.SlackAttachmentField{
			{Title: "Subject", Value: req.Subject, Short: false},
		}
		if req.Priority != "" {
			fields = append(fields, &model.SlackAttachmentField{Title: "Priority", Value: req.Priority, Short: true})
		}
		if req.Type != "" {
			fields = append(fields, &model.SlackAttachmentField{Title: "Type", Value: req.Type, Short: true})
		}

		post.AddProp("attachments", []*model.SlackAttachment{
			{
				Color:     "#1f73b7",
				Title:     fmt.Sprintf("Zendesk Ticket #%d Created", ticket.ID),
				TitleLink: ticketURL,
				Fields:    fields,
			},
		})

		if err := p.client.Post.CreatePost(post); err != nil {
			p.API.LogError("Failed to post ticket creation confirmation", "error", err.Error())
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ticket_id":  ticket.ID,
		"ticket_url": ticketURL,
	})
}

// attachPostToTicketRequest is the request payload for attaching a post to an existing ticket.
type attachPostToTicketRequest struct {
	TicketID  int64  `json:"ticket_id"`
	PostID    string `json:"post_id"`
	ChannelID string `json:"channel_id"`
	Public    bool   `json:"public"`
}

// handleAttachPostToTicket adds a Mattermost post's content as a comment on a Zendesk ticket.
func (p *Plugin) handleAttachPostToTicket(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var req attachPostToTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	if req.TicketID == 0 || req.PostID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ticket_id and post_id are required"})
		return
	}

	// Get the post content
	post, err := p.client.Post.GetPost(req.PostID)
	if err != nil {
		p.API.LogError("Failed to get post", "error", err.Error())
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get post"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	config := p.getConfiguration()

	// Get the Mattermost user name for context in the comment
	mmUser, userErr := p.client.User.Get(userID)
	authorName := "a Mattermost user"
	if userErr == nil && mmUser != nil {
		authorName = mmUser.GetDisplayName(model.ShowNicknameFullName)
	}

	commentBody := fmt.Sprintf("From Mattermost (posted by %s):\n\n%s", authorName, post.Message)
	if err := zdClient.AddTicketComment(req.TicketID, commentBody, req.Public); err != nil {
		p.API.LogError("Failed to attach post to ticket", "error", err.Error())
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to attach post to ticket"})
		return
	}

	ticketURL := fmt.Sprintf("%s/agent/tickets/%d", config.GetZendeskURL(), req.TicketID)

	// Post confirmation in the channel
	if req.ChannelID != "" {
		noteType := "public reply"
		if !req.Public {
			noteType = "internal note"
		}

		confirmPost := &model.Post{
			UserId:    p.botUserID,
			ChannelId: req.ChannelID,
		}
		confirmPost.AddProp("attachments", []*model.SlackAttachment{
			{
				Color:     "#1f73b7",
				Title:     fmt.Sprintf("Post attached to Zendesk Ticket #%d", req.TicketID),
				TitleLink: ticketURL,
				Text:      fmt.Sprintf("Added as %s", noteType),
			},
		})

		if err := p.client.Post.CreatePost(confirmPost); err != nil {
			p.API.LogError("Failed to post attachment confirmation", "error", err.Error())
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
