package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/plugin"

	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

func (p *Plugin) initRouter() *mux.Router {
	router := mux.NewRouter()

	// Public endpoints (no Mattermost auth required)
	router.HandleFunc("/api/v1/webhook", p.handleWebhook).Methods(http.MethodPost)

	// OAuth endpoints (auth required for connect, callback is public)
	router.HandleFunc("/api/v1/oauth/connect", p.handleOAuthConnect).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/oauth/callback", p.handleOAuthCallback).Methods(http.MethodGet)

	// Authenticated API endpoints
	apiRouter := router.PathPrefix("/api/v1").Subrouter()
	apiRouter.Use(p.MattermostAuthorizationRequired)

	// User connection status
	apiRouter.HandleFunc("/user/connected", p.handleUserConnected).Methods(http.MethodGet)
	apiRouter.HandleFunc("/user/disconnect", p.handleUserDisconnect).Methods(http.MethodPost)

	// Tickets — specific routes must come before parameterized {id} routes
	apiRouter.HandleFunc("/tickets/mine", p.handleMyTickets).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tickets/search", p.handleTicketSearch).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tickets/create", p.handleCreateTicketDirect).Methods(http.MethodPost)
	apiRouter.HandleFunc("/tickets/{id:[0-9]+}", p.handleGetTicket).Methods(http.MethodGet)
	// Note: /tickets/{id}/update was moved to /actions/ to avoid gorilla/mux subrouter issues
	// with parameterized sub-paths that cause 404s.
	apiRouter.HandleFunc("/tickets/{id:[0-9]+}/comments", p.handleGetTicketComments).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tickets/{id:[0-9]+}/comments", p.handleAddTicketComment).Methods(http.MethodPost)

	// Articles
	apiRouter.HandleFunc("/articles/search", p.handleArticleSearch).Methods(http.MethodGet)

	// Users
	apiRouter.HandleFunc("/users/{id:[0-9]+}", p.handleGetUser).Methods(http.MethodGet)
	apiRouter.HandleFunc("/users/search", p.handleUserSearch).Methods(http.MethodGet)

	// Organizations
	apiRouter.HandleFunc("/organizations/{id:[0-9]+}", p.handleGetOrganization).Methods(http.MethodGet)
	apiRouter.HandleFunc("/organizations/search", p.handleOrganizationSearch).Methods(http.MethodGet)

	// Views
	apiRouter.HandleFunc("/views", p.handleGetViews).Methods(http.MethodGet)
	apiRouter.HandleFunc("/views/{id:[0-9]+}/tickets", p.handleGetViewTickets).Methods(http.MethodGet)

	// Dialog submissions
	apiRouter.HandleFunc("/dialog/create-ticket", p.handleCreateTicketDialog).Methods(http.MethodPost)

	// Post actions
	apiRouter.HandleFunc("/actions/create-ticket-from-post", p.handleCreateTicketFromPost).Methods(http.MethodPost)
	apiRouter.HandleFunc("/actions/attach-post-to-ticket", p.handleAttachPostToTicket).Methods(http.MethodPost)
	apiRouter.HandleFunc("/actions/update-ticket", p.handleUpdateTicket).Methods(http.MethodPost)

	return router
}

// ServeHTTP routes HTTP requests to the plugin's router.
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB request body limit
	p.router.ServeHTTP(w, r)
}

// MattermostAuthorizationRequired is middleware that requires a valid Mattermost session.
func (p *Plugin) MattermostAuthorizationRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("Mattermost-User-ID")
		if userID == "" {
			p.handleErrorWithCode(w, http.StatusUnauthorized, "Not authorized", nil)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// handleUserConnected returns the user's Zendesk connection status.
func (p *Plugin) handleUserConnected(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	token, err := p.kvstore.GetOAuthToken(userID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	if token == nil {
		writeJSON(w, http.StatusOK, map[string]any{"connected": false})
		return
	}

	zdUser, _ := p.kvstore.GetZendeskUser(userID)
	config := p.getConfiguration()
	result := map[string]any{
		"connected": true,
		"subdomain": config.ZendeskSubdomain,
	}
	if zdUser != nil {
		result["user"] = map[string]string{
			"name":  zdUser.Name,
			"email": zdUser.Email,
		}
	}
	writeJSON(w, http.StatusOK, result)
}

// handleUserDisconnect disconnects the user's Zendesk account.
func (p *Plugin) handleUserDisconnect(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	_ = p.kvstore.DeleteOAuthToken(userID)
	_ = p.kvstore.DeleteZendeskUser(userID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleMyTickets returns tickets assigned to the authenticated user.
func (p *Plugin) handleMyTickets(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)

	var tickets []zendesk.Ticket
	if clientInfo.zendeskUser != nil {
		tickets, err = zdClient.GetMyTickets(clientInfo.zendeskUser.ZendeskUserID)
		if err != nil {
			p.handleError(w, err)
			return
		}
	}

	if tickets == nil {
		tickets = []zendesk.Ticket{}
	}

	writeJSON(w, http.StatusOK, map[string]any{"tickets": tickets})
}

// handleTicketSearch searches Zendesk tickets.
func (p *Plugin) handleTicketSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	query := r.URL.Query().Get("q")
	if query == "" {
		p.handleErrorWithCode(w, http.StatusBadRequest, "query parameter 'q' is required", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchTickets(query)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"tickets": result.Results, "count": result.Count})
}

// handleGetTicket returns a single ticket by ID.
func (p *Plugin) handleGetTicket(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	ticketID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid ticket ID", err)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	ticket, err := zdClient.GetTicket(ticketID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ticket": ticket})
}

// handleUpdateTicket updates a ticket's fields (assignee, requester, etc.).
// Uses /actions/update-ticket with ticket_id in the body to avoid gorilla/mux
// subrouter issues with parameterized sub-paths.
func (p *Plugin) handleUpdateTicket(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	// Decode into raw map to distinguish between missing fields and explicit null
	var rawBody map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&rawBody); err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	// Extract ticket_id (required)
	rawTicketID, ok := rawBody["ticket_id"]
	if !ok {
		p.handleErrorWithCode(w, http.StatusBadRequest, "ticket_id is required", nil)
		return
	}
	var ticketID int64
	if err := json.Unmarshal(rawTicketID, &ticketID); err != nil || ticketID <= 0 {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid ticket_id", nil)
		return
	}

	// Build the Zendesk ticket update body dynamically so we only include
	// fields the caller actually sent, and correctly pass null to clear values.
	ticketBody := map[string]any{}

	if rawVal, exists := rawBody["assignee_id"]; exists {
		if string(rawVal) == "null" {
			ticketBody["assignee_id"] = nil
		} else {
			var id int64
			if err := json.Unmarshal(rawVal, &id); err == nil {
				ticketBody["assignee_id"] = id
			}
		}
	}

	if rawVal, exists := rawBody["requester_id"]; exists {
		if string(rawVal) == "null" {
			ticketBody["requester_id"] = nil
		} else {
			var id int64
			if err := json.Unmarshal(rawVal, &id); err == nil {
				ticketBody["requester_id"] = id
			}
		}
	}

	if len(ticketBody) == 0 {
		p.handleErrorWithCode(w, http.StatusBadRequest, "no fields to update", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	updateReq := map[string]any{"ticket": ticketBody}

	ticket, err := zdClient.UpdateTicketRaw(ticketID, updateReq)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ticket": ticket})
}

// handleGetTicketComments returns comments for a ticket.
func (p *Plugin) handleGetTicketComments(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	ticketID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid ticket ID", err)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	comments, err := zdClient.GetTicketComments(ticketID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	if comments == nil {
		comments = []zendesk.Comment{}
	}

	writeJSON(w, http.StatusOK, map[string]any{"comments": comments})
}

// handleAddTicketComment adds a comment (public reply or internal note) to a ticket.
func (p *Plugin) handleAddTicketComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	ticketID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid ticket ID", err)
		return
	}

	var reqBody struct {
		Body   string `json:"body"`
		Public bool   `json:"public"`
		Status string `json:"status"`
	}
	if decodeErr := json.NewDecoder(r.Body).Decode(&reqBody); decodeErr != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid request body", decodeErr)
		return
	}
	if strings.TrimSpace(reqBody.Body) == "" && reqBody.Status == "" {
		p.handleErrorWithCode(w, http.StatusBadRequest, "comment body or status change is required", nil)
		return
	}
	validStatuses := map[string]bool{"": true, "new": true, "open": true, "pending": true, "hold": true, "solved": true}
	if !validStatuses[reqBody.Status] {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid status", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	if err := zdClient.AddTicketComment(ticketID, reqBody.Body, reqBody.Public, reqBody.Status); err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleArticleSearch searches Zendesk Help Center articles.
func (p *Plugin) handleArticleSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	query := r.URL.Query().Get("q")
	if query == "" {
		p.handleErrorWithCode(w, http.StatusBadRequest, "query parameter 'q' is required", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchArticles(query)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"articles": result.Results, "count": result.Count})
}

// handleGetUser returns a single Zendesk user by ID.
func (p *Plugin) handleGetUser(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	zdUserID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid user ID", err)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	user, err := zdClient.GetUser(zdUserID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

// handleUserSearch searches Zendesk users.
func (p *Plugin) handleUserSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	query := r.URL.Query().Get("q")
	if query == "" {
		p.handleErrorWithCode(w, http.StatusBadRequest, "query parameter 'q' is required", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchUsers(query)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"users": result.Users, "count": result.Count})
}

// handleGetOrganization returns a single Zendesk organization by ID.
func (p *Plugin) handleGetOrganization(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	orgID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid organization ID", err)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	org, err := zdClient.GetOrganization(orgID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"organization": org})
}

// handleOrganizationSearch searches Zendesk organizations.
func (p *Plugin) handleOrganizationSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	query := r.URL.Query().Get("q")
	if query == "" {
		p.handleErrorWithCode(w, http.StatusBadRequest, "query parameter 'q' is required", nil)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchOrganizations(query)
	if err != nil {
		p.handleError(w, err)
		return
	}

	// SearchOrganizations uses the general search API which returns results in "results" field
	orgs := result.Results
	if orgs == nil {
		orgs = result.Organizations
	}
	if orgs == nil {
		orgs = []zendesk.Organization{}
	}

	writeJSON(w, http.StatusOK, map[string]any{"organizations": orgs, "count": result.Count})
}

// handleGetViews returns the list of active Zendesk views.
func (p *Plugin) handleGetViews(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	views, err := zdClient.GetViews()
	if err != nil {
		p.handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"views": views})
}

// handleGetViewTickets returns tickets belonging to a specific Zendesk view.
func (p *Plugin) handleGetViewTickets(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	vars := mux.Vars(r)

	viewID, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusBadRequest, "invalid view ID", err)
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		p.handleErrorWithCode(w, http.StatusUnauthorized, "Not connected to Zendesk", err)
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	tickets, err := zdClient.GetViewTickets(viewID)
	if err != nil {
		p.handleError(w, err)
		return
	}

	if tickets == nil {
		tickets = []zendesk.Ticket{}
	}

	writeJSON(w, http.StatusOK, map[string]any{"tickets": tickets})
}

func writeJSON(w http.ResponseWriter, statusCode int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(v)
}
