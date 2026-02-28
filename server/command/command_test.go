package command

import (
	"testing"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin/plugintest"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/stretchr/testify/assert"

	"github.com/svelle/mattermost-plugin-zendesk/server/store/kvstore"
)

type mockConfig struct{}

func (m *mockConfig) GetZendeskSubdomain() string { return "test" }
func (m *mockConfig) GetZendeskURL() string        { return "https://test.zendesk.com" }
func (m *mockConfig) IsValid() error               { return nil }

type mockStore struct{}

func (m *mockStore) StoreOAuthState(string, string) error                              { return nil }
func (m *mockStore) GetAndDeleteOAuthState(string) (string, error)                     { return "", nil }
func (m *mockStore) StoreOAuthToken(string, *kvstore.OAuthToken) error                 { return nil }
func (m *mockStore) GetOAuthToken(string) (*kvstore.OAuthToken, error)                 { return nil, nil }
func (m *mockStore) DeleteOAuthToken(string) error                                     { return nil }
func (m *mockStore) StoreZendeskUser(string, *kvstore.ZendeskUserInfo) error           { return nil }
func (m *mockStore) GetZendeskUser(string) (*kvstore.ZendeskUserInfo, error)           { return nil, nil }
func (m *mockStore) DeleteZendeskUser(string) error                                    { return nil }
func (m *mockStore) GetSubscription(string) (*kvstore.Subscription, error)             { return nil, nil }
func (m *mockStore) StoreSubscription(*kvstore.Subscription) error                     { return nil }
func (m *mockStore) DeleteSubscription(string) error                                   { return nil }
func (m *mockStore) ListSubscriptions() ([]*kvstore.Subscription, error)               { return nil, nil }

type env struct {
	client *pluginapi.Client
	api    *plugintest.API
}

func setupTest() *env {
	api := &plugintest.API{}
	driver := &plugintest.Driver{}
	client := pluginapi.NewClient(api, driver)

	return &env{
		client: client,
		api:    api,
	}
}

func TestHelpCommand(t *testing.T) {
	assert := assert.New(t)
	e := setupTest()

	e.api.On("RegisterCommand", &model.Command{
		Trigger:          zendeskCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Interact with Zendesk",
		AutoCompleteHint: "[command]",
		AutocompleteData: buildAutocompleteData(),
	}).Return(nil)

	configGetter := func() Configuration { return &mockConfig{} }
	cmdHandler := NewCommandHandler(e.client, configGetter, &mockStore{}, "https://mattermost.example.com", "com.github.svelle.mattermost-plugin-zendesk", "bot-user-id")

	args := &model.CommandArgs{
		Command: "/zendesk help",
	}
	response, err := cmdHandler.Handle(args)
	assert.Nil(err)
	assert.Contains(response.Text, "Zendesk Plugin Commands")
	assert.Equal(model.CommandResponseTypeEphemeral, response.ResponseType)
}

func TestConnectCommand(t *testing.T) {
	assert := assert.New(t)
	e := setupTest()

	e.api.On("RegisterCommand", &model.Command{
		Trigger:          zendeskCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Interact with Zendesk",
		AutoCompleteHint: "[command]",
		AutocompleteData: buildAutocompleteData(),
	}).Return(nil)

	configGetter := func() Configuration { return &mockConfig{} }
	cmdHandler := NewCommandHandler(e.client, configGetter, &mockStore{}, "https://mattermost.example.com", "com.github.svelle.mattermost-plugin-zendesk", "bot-user-id")

	args := &model.CommandArgs{
		Command: "/zendesk connect",
		UserId:  "user-123",
	}
	response, err := cmdHandler.Handle(args)
	assert.Nil(err)
	assert.Contains(response.Text, "Click here to connect")
	assert.Equal(model.CommandResponseTypeEphemeral, response.ResponseType)
}

func TestUnknownCommand(t *testing.T) {
	assert := assert.New(t)
	e := setupTest()

	e.api.On("RegisterCommand", &model.Command{
		Trigger:          zendeskCommandTrigger,
		AutoComplete:     true,
		AutoCompleteDesc: "Interact with Zendesk",
		AutoCompleteHint: "[command]",
		AutocompleteData: buildAutocompleteData(),
	}).Return(nil)

	configGetter := func() Configuration { return &mockConfig{} }
	cmdHandler := NewCommandHandler(e.client, configGetter, &mockStore{}, "https://mattermost.example.com", "com.github.svelle.mattermost-plugin-zendesk", "bot-user-id")

	args := &model.CommandArgs{
		Command: "/zendesk foobar",
	}
	response, err := cmdHandler.Handle(args)
	assert.Nil(err)
	assert.Contains(response.Text, "Unknown command")
}

// buildAutocompleteData constructs the autocomplete data for test assertions.
func buildAutocompleteData() *model.AutocompleteData {
	autocomplete := model.NewAutocompleteData(zendeskCommandTrigger, "[command]", "Interact with Zendesk")
	autocomplete.AddCommand(model.NewAutocompleteData("connect", "", "Connect your Zendesk account"))
	autocomplete.AddCommand(model.NewAutocompleteData("disconnect", "", "Disconnect your Zendesk account"))
	autocomplete.AddCommand(model.NewAutocompleteData("create", "", "Create a new Zendesk ticket"))
	autocomplete.AddCommand(model.NewAutocompleteData("ticket", "[id]", "View a Zendesk ticket by ID"))
	autocomplete.AddCommand(model.NewAutocompleteData("search", "[query]", "Search Zendesk tickets"))
	autocomplete.AddCommand(model.NewAutocompleteData("article", "[query]", "Search Zendesk Help Center articles"))
	autocomplete.AddCommand(model.NewAutocompleteData("subscribe", "[--group=name] [--priority=level]", "Subscribe this channel to Zendesk notifications"))
	autocomplete.AddCommand(model.NewAutocompleteData("unsubscribe", "", "Unsubscribe this channel from Zendesk notifications"))
	autocomplete.AddCommand(model.NewAutocompleteData("help", "", "Show available commands"))
	return autocomplete
}
