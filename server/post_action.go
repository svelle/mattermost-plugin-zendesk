package main

import (
	"encoding/json"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
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
