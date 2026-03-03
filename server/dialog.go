package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"

	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

const (
	dialogFieldSubject     = "subject"
	dialogFieldDescription = "description"
	dialogFieldPriority    = "priority"
	dialogFieldType        = "type"
)

// openCreateTicketDialog opens an interactive dialog for creating a Zendesk ticket.
func (p *Plugin) openCreateTicketDialog(triggerID, userID, description string) {
	siteURL := p.API.GetConfig().ServiceSettings.SiteURL

	dialog := model.OpenDialogRequest{
		TriggerId: triggerID,
		URL:       fmt.Sprintf("%s/plugins/%s/api/v1/dialog/create-ticket", *siteURL, manifest.Id),
		Dialog: model.Dialog{
			Title:            "Create Zendesk Ticket",
			CallbackId:       "create_zendesk_ticket",
			SubmitLabel:      "Create Ticket",
			NotifyOnCancel:   false,
			Elements: []model.DialogElement{
				{
					DisplayName: "Subject",
					Name:        dialogFieldSubject,
					Type:        "text",
					Placeholder: "Brief description of the issue",
				},
				{
					DisplayName: "Description",
					Name:        dialogFieldDescription,
					Type:        "textarea",
					Default:     description,
					Placeholder: "Detailed description of the issue",
					Optional:    true,
				},
				{
					DisplayName: "Priority",
					Name:        dialogFieldPriority,
					Type:        "select",
					Optional:    true,
					Options: []*model.PostActionOptions{
						{Text: "Low", Value: "low"},
						{Text: "Normal", Value: "normal"},
						{Text: "High", Value: "high"},
						{Text: "Urgent", Value: "urgent"},
					},
					Default: "normal",
				},
				{
					DisplayName: "Type",
					Name:        dialogFieldType,
					Type:        "select",
					Optional:    true,
					Options: []*model.PostActionOptions{
						{Text: "Problem", Value: "problem"},
						{Text: "Incident", Value: "incident"},
						{Text: "Question", Value: "question"},
						{Text: "Task", Value: "task"},
					},
				},
			},
		},
	}

	if err := p.client.Frontend.OpenInteractiveDialog(dialog); err != nil {
		p.API.LogError("Failed to open create ticket dialog", "error", err.Error())
	}
}

// handleCreateTicketDialog handles the dialog submission for creating a ticket.
func (p *Plugin) handleCreateTicketDialog(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var submission model.SubmitDialogRequest
	if err := json.NewDecoder(r.Body).Decode(&submission); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	subject, _ := submission.Submission[dialogFieldSubject].(string)
	description, _ := submission.Submission[dialogFieldDescription].(string)
	priority, _ := submission.Submission[dialogFieldPriority].(string)
	ticketType, _ := submission.Submission[dialogFieldType].(string)

	if subject == "" {
		writeJSON(w, http.StatusOK, model.SubmitDialogResponse{
			Errors: map[string]string{dialogFieldSubject: "Subject is required"},
		})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusOK, model.SubmitDialogResponse{
			Error: "You are not connected to Zendesk. Use `/zendesk connect` first.",
		})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	config := p.getConfiguration()

	ticket, err := zdClient.CreateTicket(&zendesk.TicketCreateRequest{
		Ticket: zendesk.TicketCreateBody{
			Subject:     subject,
			Description: description,
			Priority:    priority,
			Type:        ticketType,
		},
	})
	if err != nil {
		p.API.LogError("Failed to create Zendesk ticket", "error", err.Error())
		writeJSON(w, http.StatusOK, model.SubmitDialogResponse{
			Error: "Failed to create ticket. Please try again or contact your administrator.",
		})
		return
	}

	ticketURL := fmt.Sprintf("%s/agent/tickets/%d", config.GetZendeskURL(), ticket.ID)

	// Post a confirmation message in the channel
	post := &model.Post{
		UserId:    p.botUserID,
		ChannelId: submission.ChannelId,
	}
	post.AddProp("attachments", []*model.SlackAttachment{
		{
			Color:     "#1f73b7",
			Title:     fmt.Sprintf("Zendesk Ticket #%d Created", ticket.ID),
			TitleLink: ticketURL,
			Fields: []*model.SlackAttachmentField{
				{Title: "Subject", Value: subject, Short: false},
				{Title: "Priority", Value: priority, Short: true},
				{Title: "Type", Value: ticketType, Short: true},
			},
		},
	})

	if err := p.client.Post.CreatePost(post); err != nil {
		p.API.LogError("Failed to post ticket creation confirmation", "error", err.Error())
	}

	writeJSON(w, http.StatusOK, model.SubmitDialogResponse{})
}
