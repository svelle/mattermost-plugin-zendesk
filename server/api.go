package main

import (
	"encoding/json"
	"net/http"
	"strconv"

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

	// Tickets
	apiRouter.HandleFunc("/tickets/mine", p.handleMyTickets).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tickets/search", p.handleTicketSearch).Methods(http.MethodGet)
	apiRouter.HandleFunc("/tickets/{id:[0-9]+}", p.handleGetTicket).Methods(http.MethodGet)

	// Articles
	apiRouter.HandleFunc("/articles/search", p.handleArticleSearch).Methods(http.MethodGet)

	// Views
	apiRouter.HandleFunc("/views", p.handleGetViews).Methods(http.MethodGet)
	apiRouter.HandleFunc("/views/{id:[0-9]+}/tickets", p.handleGetViewTickets).Methods(http.MethodGet)

	// Dialog submissions
	apiRouter.HandleFunc("/dialog/create-ticket", p.handleCreateTicketDialog).Methods(http.MethodPost)

	// Post actions
	apiRouter.HandleFunc("/actions/create-ticket-from-post", p.handleCreateTicketFromPost).Methods(http.MethodPost)

	return router
}

// ServeHTTP routes HTTP requests to the plugin's router.
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	p.router.ServeHTTP(w, r)
}

// MattermostAuthorizationRequired is middleware that requires a valid Mattermost session.
func (p *Plugin) MattermostAuthorizationRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("Mattermost-User-ID")
		if userID == "" {
			http.Error(w, "Not authorized", http.StatusUnauthorized)
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
		p.API.LogError("Failed to get OAuth token", "error", err.Error())
		writeJSON(w, http.StatusOK, map[string]any{"connected": false})
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
		writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)

	var tickets []zendesk.Ticket
	if clientInfo.zendeskUser != nil {
		tickets, err = zdClient.GetMyTickets(clientInfo.zendeskUser.ZendeskUserID)
		if err != nil {
			p.API.LogError("Failed to get user tickets", "error", err.Error())
			writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": "Failed to fetch tickets"})
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
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "query parameter 'q' is required"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchTickets(query)
	if err != nil {
		p.API.LogError("Failed to search tickets", "error", err.Error())
		writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": "Failed to search tickets"})
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
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid ticket ID"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	ticket, err := zdClient.GetTicket(ticketID)
	if err != nil {
		p.API.LogError("Failed to get ticket", "error", err.Error())
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get ticket"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ticket": ticket})
}

// handleArticleSearch searches Zendesk Help Center articles.
func (p *Plugin) handleArticleSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	query := r.URL.Query().Get("q")
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "query parameter 'q' is required"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"articles": []any{}, "error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	result, err := zdClient.SearchArticles(query)
	if err != nil {
		p.API.LogError("Failed to search articles", "error", err.Error())
		writeJSON(w, http.StatusOK, map[string]any{"articles": []any{}, "error": "Failed to search articles"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"articles": result.Results, "count": result.Count})
}

// handleGetViews returns the list of active Zendesk views.
func (p *Plugin) handleGetViews(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"views": []any{}, "error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	views, err := zdClient.GetViews()
	if err != nil {
		p.API.LogError("Failed to get views", "error", err.Error())
		writeJSON(w, http.StatusOK, map[string]any{"views": []any{}, "error": "Failed to fetch views"})
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
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid view ID"})
		return
	}

	clientInfo, err := p.getZendeskClientForUser(userID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": err.Error()})
		return
	}

	zdClient := zendesk.NewClient(clientInfo.subdomain, clientInfo.token)
	tickets, err := zdClient.GetViewTickets(viewID)
	if err != nil {
		p.API.LogError("Failed to get view tickets", "error", err.Error())
		writeJSON(w, http.StatusOK, map[string]any{"tickets": []any{}, "error": "Failed to fetch view tickets"})
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
