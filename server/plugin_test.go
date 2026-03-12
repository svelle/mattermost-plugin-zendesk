package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mattermost/mattermost/server/public/plugin/plugintest"
	"github.com/stretchr/testify/assert"

	"github.com/svelle/mattermost-plugin-zendesk/server/store/kvstore"
)

// mockKVStore is a minimal KVStore mock for testing.
type mockKVStore struct {
	getOAuthTokenErr error
}

func (m *mockKVStore) StoreOAuthState(string, string) error              { return nil }
func (m *mockKVStore) GetAndDeleteOAuthState(string) (string, error)     { return "", nil }
func (m *mockKVStore) StoreOAuthToken(string, *kvstore.OAuthToken) error { return nil }
func (m *mockKVStore) GetOAuthToken(string) (*kvstore.OAuthToken, error) {
	return nil, m.getOAuthTokenErr
}
func (m *mockKVStore) DeleteOAuthToken(string) error                           { return nil }
func (m *mockKVStore) StoreZendeskUser(string, *kvstore.ZendeskUserInfo) error { return nil }
func (m *mockKVStore) GetZendeskUser(string) (*kvstore.ZendeskUserInfo, error) { return nil, nil }
func (m *mockKVStore) DeleteZendeskUser(string) error                          { return nil }
func (m *mockKVStore) GetSubscription(string) (*kvstore.Subscription, error)   { return nil, nil }
func (m *mockKVStore) StoreSubscription(*kvstore.Subscription) error           { return nil }
func (m *mockKVStore) DeleteSubscription(string) error                         { return nil }
func (m *mockKVStore) ListSubscriptions() ([]*kvstore.Subscription, error)     { return nil, nil }

func TestServeHTTPUserConnected(t *testing.T) {
	assert := assert.New(t)

	api := &plugintest.API{}
	api.On("LogError", "public error message: An internal error has occurred. Check app server logs for details.; internal details: failed to get OAuth token: test error").Return()

	p := Plugin{}
	p.SetAPI(api)
	p.kvstore = &mockKVStore{getOAuthTokenErr: fmt.Errorf("failed to get OAuth token: test error")}
	p.router = p.initRouter()

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/user/connected", nil)
	r.Header.Set("Mattermost-User-ID", "test-user-id")

	p.ServeHTTP(nil, w, r)

	result := w.Result()
	assert.NotNil(result)
	defer func() { _ = result.Body.Close() }()
	assert.Equal(http.StatusInternalServerError, result.StatusCode)

	bodyBytes, err := io.ReadAll(result.Body)
	assert.Nil(err)

	var resp map[string]any
	err = json.Unmarshal(bodyBytes, &resp)
	assert.Nil(err)
	assert.Equal("An internal error has occurred. Check app server logs for details.", resp["error"])
}

func TestServeHTTPUnauthorized(t *testing.T) {
	assert := assert.New(t)

	api := &plugintest.API{}
	api.On("LogError", "public error message: Not authorized; internal details: ").Return()

	p := Plugin{}
	p.SetAPI(api)
	p.router = p.initRouter()

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/user/connected", nil)

	p.ServeHTTP(nil, w, r)

	result := w.Result()
	assert.Equal(http.StatusUnauthorized, result.StatusCode)
}
