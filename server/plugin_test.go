package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mattermost/mattermost/server/public/plugin/plugintest"
	"github.com/stretchr/testify/assert"
)

func TestServeHTTPUserConnected(t *testing.T) {
	assert := assert.New(t)

	api := &plugintest.API{}
	api.On("LogError", "Failed to get OAuth token", "error", "failed to get OAuth token: ").Return()

	p := Plugin{}
	p.SetAPI(api)
	p.router = p.initRouter()

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/user/connected", nil)
	r.Header.Set("Mattermost-User-ID", "test-user-id")

	p.ServeHTTP(nil, w, r)

	result := w.Result()
	assert.NotNil(result)
	defer func() { _ = result.Body.Close() }()
	bodyBytes, err := io.ReadAll(result.Body)
	assert.Nil(err)

	var resp map[string]any
	err = json.Unmarshal(bodyBytes, &resp)
	assert.Nil(err)
	assert.Equal(false, resp["connected"])
}

func TestServeHTTPUnauthorized(t *testing.T) {
	assert := assert.New(t)
	p := Plugin{}
	p.router = p.initRouter()

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/user/connected", nil)

	p.ServeHTTP(nil, w, r)

	result := w.Result()
	assert.Equal(http.StatusUnauthorized, result.StatusCode)
}
