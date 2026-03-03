package main

import (
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/pkg/errors"

	"github.com/svelle/mattermost-plugin-zendesk/server/command"
	"github.com/svelle/mattermost-plugin-zendesk/server/store/kvstore"
)

// Plugin implements the interface expected by the Mattermost server to communicate between the server and plugin processes.
type Plugin struct {
	plugin.MattermostPlugin

	// kvstore is the client used to read/write KV records for this plugin.
	kvstore kvstore.KVStore

	// client is the Mattermost server API client.
	client *pluginapi.Client

	// commandClient is the client used to register and execute slash commands.
	commandClient command.Command

	// router is the HTTP router for handling API requests.
	router *mux.Router

	// botUserID is the user ID of the bot account created by this plugin.
	botUserID string

	// webhookSem limits concurrent webhook processing goroutines.
	webhookSem chan struct{}

	// configurationLock synchronizes access to the configuration.
	configurationLock sync.RWMutex

	// configuration is the active plugin configuration. Consult getConfiguration and
	// setConfiguration for usage.
	configuration *configuration
}

// OnActivate is invoked when the plugin is activated.
func (p *Plugin) OnActivate() error {
	p.client = pluginapi.NewClient(p.API, p.Driver)

	p.kvstore = kvstore.NewKVStore(p.client)

	// Create bot account
	botID, err := p.client.Bot.EnsureBot(&model.Bot{
		Username:    "zendesk",
		DisplayName: "Zendesk",
		Description: "Zendesk integration bot account.",
	})
	if err != nil {
		return errors.Wrap(err, "failed to ensure bot account")
	}
	p.botUserID = botID

	siteURL := p.API.GetConfig().ServiceSettings.SiteURL
	if siteURL == nil || *siteURL == "" {
		return errors.New("siteURL must be configured in Mattermost settings")
	}

	configGetter := func() command.Configuration {
		return p.getConfiguration()
	}
	p.commandClient = command.NewCommandHandler(
		p.client,
		configGetter,
		p.kvstore,
		*siteURL,
		manifest.Id,
		p.botUserID,
	)

	p.webhookSem = make(chan struct{}, 20) // max 20 concurrent webhook handlers
	p.router = p.initRouter()

	return nil
}

// OnDeactivate is invoked when the plugin is deactivated.
func (p *Plugin) OnDeactivate() error {
	return nil
}

// ExecuteCommand dispatches slash commands to the command handler.
func (p *Plugin) ExecuteCommand(c *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	// Handle the /zendesk create command specially since it needs to open a dialog
	fields := strings.Fields(args.Command)
	if len(fields) >= 2 && fields[1] == "create" {
		return p.handleCreateCommand(args)
	}

	response, err := p.commandClient.Handle(args)
	if err != nil {
		return nil, model.NewAppError("ExecuteCommand", "plugin.command.execute_command.app_error", nil, err.Error(), http.StatusInternalServerError)
	}
	return response, nil
}

func (p *Plugin) handleCreateCommand(args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	token, _ := p.kvstore.GetOAuthToken(args.UserId)
	if token == nil {
		return &model.CommandResponse{
			ResponseType: model.CommandResponseTypeEphemeral,
			Text:         "You are not connected to Zendesk. Use `/zendesk connect` first.",
		}, nil
	}

	p.openCreateTicketDialog(args.TriggerId, args.UserId, "")

	return &model.CommandResponse{}, nil
}

// getZendeskClientForUser creates a Zendesk API client using the stored OAuth token for the given user.
func (p *Plugin) getZendeskClientForUser(userID string) (*zendeskClientInfo, error) {
	token, err := p.kvstore.GetOAuthToken(userID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get OAuth token")
	}
	if token == nil {
		return nil, errors.New("you are not connected to Zendesk. Use `/zendesk connect` to connect")
	}

	zdUser, err := p.kvstore.GetZendeskUser(userID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get Zendesk user info")
	}

	config := p.getConfiguration()
	return &zendeskClientInfo{
		subdomain:    config.ZendeskSubdomain,
		token:        token.AccessToken,
		zendeskUser:  zdUser,
	}, nil
}

type zendeskClientInfo struct {
	subdomain   string
	token       string
	zendeskUser *kvstore.ZendeskUserInfo
}
