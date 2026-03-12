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
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not authorized", nil)
		return
	}

	config := p.getConfiguration()
	if err := config.IsValid(); err != nil {
		p.handleErrorWithCode(w, http.StatusInternalServerError, "Plugin is not configured", err)
		return
	}

	// Generate a random state parameter
	state := model.NewId()
	if err := p.kvstore.StoreOAuthState(state, userID); err != nil {
		p.handleError(w, err)
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
		p.handleErrorWithCode(w, http.StatusBadRequest, "Missing code or state parameter", nil)
		return
	}

	// Validate state
	userID, err := p.kvstore.GetAndDeleteOAuthState(state)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "Invalid or expired OAuth state", err)
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

	req, err := http.NewRequest(http.MethodPost, tokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		p.handleError(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req) //nolint:bodyclose,gosec // body is closed via defer; URL is constructed from admin-configured Zendesk subdomain
	if err != nil {
		p.handleError(w, err)
		return
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		p.handleError(w, err)
		return
	}

	if resp.StatusCode != http.StatusOK {
		p.handleErrorWithCode(w, http.StatusInternalServerError, "OAuth token exchange failed", fmt.Errorf("unexpected status code: %d", resp.StatusCode))
		return
	}

	var tokenResp zendesk.OAuthTokenResponse
	if unmarshalErr := json.Unmarshal(body, &tokenResp); unmarshalErr != nil {
		p.handleError(w, unmarshalErr)
		return
	}

	// Store the token
	if storeErr := p.kvstore.StoreOAuthToken(userID, &kvstore.OAuthToken{
		AccessToken: tokenResp.AccessToken,
		TokenType:   tokenResp.TokenType,
		Scope:       tokenResp.Scope,
	}); storeErr != nil {
		p.handleError(w, storeErr)
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

	// Notify the webapp that the user has connected (auto-refresh RHS)
	p.API.PublishWebSocketEvent("connect", map[string]any{
		"connected": true,
	}, &model.WebsocketBroadcast{
		UserId: userID,
	})

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
