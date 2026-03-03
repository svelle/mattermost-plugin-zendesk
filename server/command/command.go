package command

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"

	"github.com/svelle/mattermost-plugin-zendesk/server/store/kvstore"
	"github.com/svelle/mattermost-plugin-zendesk/server/zendesk"
)

const zendeskCommandTrigger = "zendesk"

// Configuration provides the command handler access to plugin config.
type Configuration interface {
	GetZendeskSubdomain() string
	GetZendeskURL() string
	IsValid() error
}

// Command is the interface for handling slash commands.
type Command interface {
	Handle(args *model.CommandArgs) (*model.CommandResponse, error)
}

// Handler handles /zendesk slash commands.
type Handler struct {
	client    *pluginapi.Client
	config    func() Configuration
	store     kvstore.KVStore
	siteURL   string
	pluginID  string
	botUserID string
}

// NewCommandHandler registers the /zendesk command and returns the handler.
func NewCommandHandler(
	client *pluginapi.Client,
	config func() Configuration,
	store kvstore.KVStore,
	siteURL string,
	pluginID string,
	botUserID string,
) Command {
	autocomplete := model.NewAutocompleteData(zendeskCommandTrigger, "[command]", "Interact with Zendesk")

	connect := model.NewAutocompleteData("connect", "", "Connect your Zendesk account")
	disconnect := model.NewAutocompleteData("disconnect", "", "Disconnect your Zendesk account")
	create := model.NewAutocompleteData("create", "", "Create a new Zendesk ticket")
	ticket := model.NewAutocompleteData("ticket", "[id]", "View a Zendesk ticket by ID")
	search := model.NewAutocompleteData("search", "[query]", "Search Zendesk tickets")
	article := model.NewAutocompleteData("article", "[query]", "Search Zendesk Help Center articles")
	subscribe := model.NewAutocompleteData("subscribe", "[--group=name] [--priority=level]", "Subscribe this channel to Zendesk notifications")
	unsubscribe := model.NewAutocompleteData("unsubscribe", "", "Unsubscribe this channel from Zendesk notifications")
	help := model.NewAutocompleteData("help", "", "Show available commands")

	autocomplete.AddCommand(connect)
	autocomplete.AddCommand(disconnect)
	autocomplete.AddCommand(create)
	autocomplete.AddCommand(ticket)
	autocomplete.AddCommand(search)
	autocomplete.AddCommand(article)
	autocomplete.AddCommand(subscribe)
	autocomplete.AddCommand(unsubscribe)
	autocomplete.AddCommand(help)

	err := client.SlashCommand.Register(&model.Command{
		Trigger:          zendeskCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Interact with Zendesk",
		AutoCompleteHint: "[command]",
		AutocompleteData: autocomplete,
	})
	if err != nil {
		client.Log.Error("Failed to register command", "error", err)
	}

	return &Handler{
		client:    client,
		config:    config,
		store:     store,
		siteURL:   siteURL,
		pluginID:  pluginID,
		botUserID: botUserID,
	}
}

func (h *Handler) Handle(args *model.CommandArgs) (*model.CommandResponse, error) {
	fields := strings.Fields(args.Command)
	if len(fields) < 2 {
		return h.helpResponse(), nil
	}

	subcommand := fields[1]
	restArgs := ""
	if len(fields) > 2 {
		restArgs = strings.Join(fields[2:], " ")
	}

	switch subcommand {
	case "connect":
		return h.handleConnect(args)
	case "disconnect":
		return h.handleDisconnect(args)
	case "create":
		return h.handleCreate(args)
	case "ticket":
		return h.handleTicket(args, restArgs)
	case "search":
		return h.handleSearch(args, restArgs)
	case "article":
		return h.handleArticle(args, restArgs)
	case "subscribe":
		return h.handleSubscribe(args, restArgs)
	case "unsubscribe":
		return h.handleUnsubscribe(args)
	case "help":
		return h.helpResponse(), nil
	default:
		return ephemeral(fmt.Sprintf("Unknown command: `%s`. Use `/zendesk help` to see available commands.", subcommand)), nil
	}
}

func (h *Handler) handleConnect(args *model.CommandArgs) (*model.CommandResponse, error) {
	config := h.config()
	if err := config.IsValid(); err != nil {
		return ephemeral("Zendesk plugin is not configured. Please contact your system administrator."), nil
	}

	// Check if already connected
	token, _ := h.store.GetOAuthToken(args.UserId)
	if token != nil {
		return ephemeral("You are already connected to Zendesk. Use `/zendesk disconnect` first to reconnect."), nil
	}

	connectURL := fmt.Sprintf("%s/plugins/%s/api/v1/oauth/connect", h.siteURL, h.pluginID)
	return ephemeral(fmt.Sprintf("[Click here to connect your Zendesk account](%s)", connectURL)), nil
}

func (h *Handler) handleDisconnect(args *model.CommandArgs) (*model.CommandResponse, error) {
	token, _ := h.store.GetOAuthToken(args.UserId)
	if token == nil {
		return ephemeral("You are not connected to Zendesk."), nil
	}

	_ = h.store.DeleteOAuthToken(args.UserId)
	_ = h.store.DeleteZendeskUser(args.UserId)

	return ephemeral("You have been disconnected from Zendesk."), nil
}

func (h *Handler) handleCreate(args *model.CommandArgs) (*model.CommandResponse, error) {
	token, _ := h.store.GetOAuthToken(args.UserId)
	if token == nil {
		return ephemeral("You are not connected to Zendesk. Use `/zendesk connect` first."), nil
	}

	// Return a response that will trigger the dialog from the server side.
	// The actual dialog opening is handled via the plugin's API endpoint.
	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         "Opening ticket creation dialog...",
		ExtraResponses: []*model.CommandResponse{{
			ResponseType: model.CommandResponseTypeEphemeral,
			TriggerId:    args.TriggerId,
		}},
	}, nil
}

func (h *Handler) handleTicket(args *model.CommandArgs, ticketIDStr string) (*model.CommandResponse, error) {
	if ticketIDStr == "" {
		return ephemeral("Usage: `/zendesk ticket [id]`"), nil
	}

	token, _ := h.store.GetOAuthToken(args.UserId)
	if token == nil {
		return ephemeral("You are not connected to Zendesk. Use `/zendesk connect` first."), nil
	}

	ticketID, err := strconv.ParseInt(strings.TrimSpace(ticketIDStr), 10, 64)
	if err != nil {
		return ephemeral("Invalid ticket ID. Please provide a numeric ticket ID."), nil
	}

	config := h.config()
	zdClient := zendesk.NewClient(config.GetZendeskSubdomain(), token.AccessToken)
	ticket, err := zdClient.GetTicket(ticketID)
	if err != nil {
		return ephemeral(fmt.Sprintf("Failed to get ticket #%d: %s", ticketID, err.Error())), nil
	}

	ticketURL := fmt.Sprintf("%s/agent/tickets/%d", config.GetZendeskURL(), ticket.ID)
	attachment := &model.SlackAttachment{
		Color:     statusColor(ticket.Status),
		Title:     fmt.Sprintf("[#%d] %s", ticket.ID, ticket.Subject),
		TitleLink: ticketURL,
		Fields: []*model.SlackAttachmentField{
			{Title: "Status", Value: ticket.Status, Short: true},
			{Title: "Priority", Value: ticket.Priority, Short: true},
			{Title: "Type", Value: ticket.Type, Short: true},
			{Title: "Created", Value: ticket.CreatedAt, Short: true},
		},
		Text: truncate(ticket.Description, 500),
	}

	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Attachments:  []*model.SlackAttachment{attachment},
	}, nil
}

func (h *Handler) handleSearch(args *model.CommandArgs, query string) (*model.CommandResponse, error) {
	if query == "" {
		return ephemeral("Usage: `/zendesk search [query]`"), nil
	}

	token, _ := h.store.GetOAuthToken(args.UserId)
	if token == nil {
		return ephemeral("You are not connected to Zendesk. Use `/zendesk connect` first."), nil
	}

	config := h.config()
	zdClient := zendesk.NewClient(config.GetZendeskSubdomain(), token.AccessToken)
	result, err := zdClient.SearchTickets(query)
	if err != nil {
		return ephemeral(fmt.Sprintf("Search failed: %s", err.Error())), nil
	}

	if len(result.Results) == 0 {
		return ephemeral("No tickets found matching your query."), nil
	}

	var attachments []*model.SlackAttachment
	limit := 10
	if len(result.Results) < limit {
		limit = len(result.Results)
	}

	for _, ticket := range result.Results[:limit] {
		ticketURL := fmt.Sprintf("%s/agent/tickets/%d", config.GetZendeskURL(), ticket.ID)
		attachments = append(attachments, &model.SlackAttachment{
			Color:     statusColor(ticket.Status),
			Title:     fmt.Sprintf("[#%d] %s", ticket.ID, ticket.Subject),
			TitleLink: ticketURL,
			Fields: []*model.SlackAttachmentField{
				{Title: "Status", Value: ticket.Status, Short: true},
				{Title: "Priority", Value: ticket.Priority, Short: true},
			},
		})
	}

	text := fmt.Sprintf("Found %d ticket(s)", result.Count)
	if result.Count > limit {
		text += fmt.Sprintf(" (showing first %d)", limit)
	}

	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         text,
		Attachments:  attachments,
	}, nil
}

func (h *Handler) handleArticle(args *model.CommandArgs, query string) (*model.CommandResponse, error) {
	if query == "" {
		return ephemeral("Usage: `/zendesk article [query]`"), nil
	}

	token, _ := h.store.GetOAuthToken(args.UserId)
	if token == nil {
		return ephemeral("You are not connected to Zendesk. Use `/zendesk connect` first."), nil
	}

	config := h.config()
	zdClient := zendesk.NewClient(config.GetZendeskSubdomain(), token.AccessToken)
	result, err := zdClient.SearchArticles(query)
	if err != nil {
		return ephemeral(fmt.Sprintf("Article search failed: %s", err.Error())), nil
	}

	if len(result.Results) == 0 {
		return ephemeral("No articles found matching your query."), nil
	}

	var lines []string
	limit := 10
	if len(result.Results) < limit {
		limit = len(result.Results)
	}

	for _, article := range result.Results[:limit] {
		lines = append(lines, fmt.Sprintf("- [%s](%s)", article.Title, article.HTMLURL))
	}

	text := fmt.Sprintf("Found %d article(s):\n\n%s", result.Count, strings.Join(lines, "\n"))

	return ephemeral(text), nil
}

func (h *Handler) handleSubscribe(args *model.CommandArgs, rawArgs string) (*model.CommandResponse, error) {
	// Check if user has permission to manage channel
	if !h.client.User.HasPermissionToChannel(args.UserId, args.ChannelId, model.PermissionManageChannelRoles) {
		return ephemeral("You don't have permission to manage subscriptions in this channel."), nil
	}

	// Check if already subscribed
	existing, _ := h.store.GetSubscription(args.ChannelId)
	if existing != nil {
		return ephemeral("This channel is already subscribed to Zendesk notifications. Use `/zendesk unsubscribe` first."), nil
	}

	// Parse optional filters
	var groupFilter, priorityFilter string
	for _, arg := range strings.Fields(rawArgs) {
		if strings.HasPrefix(arg, "--group=") {
			groupFilter = strings.TrimPrefix(arg, "--group=")
		} else if strings.HasPrefix(arg, "--priority=") {
			priorityFilter = strings.TrimPrefix(arg, "--priority=")
		}
	}

	sub := &kvstore.Subscription{
		ChannelID:      args.ChannelId,
		CreatorID:      args.UserId,
		GroupFilter:    groupFilter,
		PriorityFilter: priorityFilter,
		CreatedAt:      time.Now().Unix(),
	}

	if err := h.store.StoreSubscription(sub); err != nil {
		return ephemeral(fmt.Sprintf("Failed to create subscription: %s", err.Error())), nil
	}

	msg := "This channel is now subscribed to Zendesk ticket notifications."
	if groupFilter != "" {
		msg += fmt.Sprintf("\n- **Group filter:** %s", groupFilter)
	}
	if priorityFilter != "" {
		msg += fmt.Sprintf("\n- **Priority filter:** %s and above", priorityFilter)
	}

	return ephemeral(msg), nil
}

func (h *Handler) handleUnsubscribe(args *model.CommandArgs) (*model.CommandResponse, error) {
	if !h.client.User.HasPermissionToChannel(args.UserId, args.ChannelId, model.PermissionManageChannelRoles) {
		return ephemeral("You don't have permission to manage subscriptions in this channel."), nil
	}

	existing, _ := h.store.GetSubscription(args.ChannelId)
	if existing == nil {
		return ephemeral("This channel is not subscribed to Zendesk notifications."), nil
	}

	if err := h.store.DeleteSubscription(args.ChannelId); err != nil {
		return ephemeral(fmt.Sprintf("Failed to remove subscription: %s", err.Error())), nil
	}

	return ephemeral("This channel has been unsubscribed from Zendesk notifications."), nil
}

func (h *Handler) helpResponse() *model.CommandResponse {
	text := `### Zendesk Plugin Commands

| Command | Description |
|---------|-------------|
| ` + "`/zendesk connect`" + ` | Connect your Zendesk account |
| ` + "`/zendesk disconnect`" + ` | Disconnect your Zendesk account |
| ` + "`/zendesk create`" + ` | Create a new Zendesk ticket |
| ` + "`/zendesk ticket [id]`" + ` | View a ticket by ID |
| ` + "`/zendesk search [query]`" + ` | Search Zendesk tickets |
| ` + "`/zendesk article [query]`" + ` | Search Help Center articles |
| ` + "`/zendesk subscribe [--group=name] [--priority=level]`" + ` | Subscribe channel to notifications |
| ` + "`/zendesk unsubscribe`" + ` | Unsubscribe channel from notifications |
| ` + "`/zendesk help`" + ` | Show this help message |`

	return ephemeral(text)
}

func ephemeral(text string) *model.CommandResponse {
	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         text,
	}
}

func statusColor(status string) string {
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

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
