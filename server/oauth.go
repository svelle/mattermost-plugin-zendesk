package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"

	"github.com/svelle/mattermost-plugin-zendesk/server/store/kvstore"
	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

func (p *Plugin) handleOAuthConnect(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	if userID == "" {
		http.Error(w, "Not authorized", http.StatusUnauthorized)
		return
	}

	config := p.getConfiguration()
	if err := config.IsValid(); err != nil {
		http.Error(w, "Plugin is not configured: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate a random state parameter
	state := model.NewId()
	if err := p.kvstore.StoreOAuthState(state, userID); err != nil {
		http.Error(w, "Failed to store OAuth state", http.StatusInternalServerError)
		return
	}

	siteURL := p.API.GetConfig().ServiceSettings.SiteURL
	redirectURI := fmt.Sprintf("%s/plugins/%s/api/v1/oauth/callback", *siteURL, manifest.Id)

	authURL := fmt.Sprintf("%s/oauth/authorizations/new?response_type=code&client_id=%s&redirect_uri=%s&scope=%s&state=%s",
		config.GetZendeskURL(),
		url.QueryEscape(config.OAuthClientID),
		url.QueryEscape(redirectURI),
		url.QueryEscape("read write"),
		url.QueryEscape(state),
	)

	http.Redirect(w, r, authURL, http.StatusFound)
}

func (p *Plugin) handleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		http.Error(w, "Missing code or state parameter", http.StatusBadRequest)
		return
	}

	// Validate state
	userID, err := p.kvstore.GetAndDeleteOAuthState(state)
	if err != nil {
		http.Error(w, "Invalid or expired OAuth state", http.StatusBadRequest)
		return
	}

	config := p.getConfiguration()
	siteURL := p.API.GetConfig().ServiceSettings.SiteURL
	redirectURI := fmt.Sprintf("%s/plugins/%s/api/v1/oauth/callback", *siteURL, manifest.Id)

	// Exchange code for token
	tokenURL := config.GetZendeskURL() + "/oauth/tokens"
	formData := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {config.OAuthClientID},
		"client_secret": {config.OAuthClientSecret},
		"redirect_uri":  {redirectURI},
		"scope":         {"read write"},
	}

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(formData.Encode()))
	if err != nil {
		p.API.LogError("Failed to exchange OAuth code", "error", err.Error())
		http.Error(w, "Failed to exchange authorization code", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read token response", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		p.API.LogError("OAuth token exchange failed", "status", resp.StatusCode, "body", string(body))
		http.Error(w, "OAuth token exchange failed", http.StatusInternalServerError)
		return
	}

	var tokenResp zendesk.OAuthTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		http.Error(w, "Failed to parse token response", http.StatusInternalServerError)
		return
	}

	// Store the token
	if err := p.kvstore.StoreOAuthToken(userID, &kvstore.OAuthToken{
		AccessToken: tokenResp.AccessToken,
		TokenType:   tokenResp.TokenType,
		Scope:       tokenResp.Scope,
	}); err != nil {
		http.Error(w, "Failed to store OAuth token", http.StatusInternalServerError)
		return
	}

	// Fetch and cache the Zendesk user info
	zdClient := zendesk.NewClient(config.ZendeskSubdomain, tokenResp.AccessToken)
	zdUser, err := zdClient.GetCurrentUser()
	if err != nil {
		p.API.LogError("Failed to get Zendesk user info", "error", err.Error())
	} else {
		_ = p.kvstore.StoreZendeskUser(userID, &kvstore.ZendeskUserInfo{
			ZendeskUserID: zdUser.ID,
			Name:          zdUser.Name,
			Email:         zdUser.Email,
		})
	}

	// Post a DM to the user confirming the connection
	p.postBotDM(userID, "You have successfully connected your Zendesk account. Use `/zendesk help` to see available commands.")

	// Redirect back to Mattermost
	http.Redirect(w, r, *siteURL, http.StatusFound)
}

func (p *Plugin) postBotDM(userID, message string) {
	channel, err := p.client.Channel.GetDirect(userID, p.botUserID)
	if err != nil {
		p.API.LogError("Failed to get DM channel for bot message", "error", err.Error())
		return
	}

	post := &model.Post{
		UserId:    p.botUserID,
		ChannelId: channel.Id,
		Message:   message,
	}
	if err := p.client.Post.CreatePost(post); err != nil {
		p.API.LogError("Failed to create bot DM post", "error", err.Error())
	}
}
