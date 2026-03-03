package main

import (
	"regexp"

	"github.com/pkg/errors"
)

// validSubdomain matches Zendesk subdomain rules: alphanumeric and hyphens only.
var validSubdomain = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$`)

// configuration captures the plugin's external configuration as exposed in the Mattermost server
// configuration, as well as values computed from the configuration. Any public fields will be
// deserialized from the Mattermost server configuration in OnConfigurationChange.
//
// As plugins are inherently concurrent (hooks being called asynchronously), and the plugin
// configuration can change at any time, access to the configuration must be synchronized. The
// strategy used in this plugin is to guard a pointer to the configuration, and clone the entire
// struct whenever it changes. You may replace this with whatever strategy you choose.
//
// If you add non-reference types to your configuration struct, be sure to rewrite Clone as a deep
// copy appropriate for your types.
type configuration struct {
	ZendeskSubdomain  string
	OAuthClientID     string
	OAuthClientSecret string
	WebhookSecret     string
	EncryptionKey     string
}

// IsValid checks if the configuration has the required fields set and values are safe.
func (c *configuration) IsValid() error {
	if c.ZendeskSubdomain == "" {
		return errors.New("zendesk subdomain is required")
	}
	if !validSubdomain.MatchString(c.ZendeskSubdomain) {
		return errors.New("zendesk subdomain contains invalid characters (only alphanumeric and hyphens allowed)")
	}
	if c.OAuthClientID == "" {
		return errors.New("OAuth client ID is required")
	}
	if c.OAuthClientSecret == "" {
		return errors.New("OAuth client secret is required")
	}
	return nil
}

// GetZendeskURL returns the base URL for the configured Zendesk instance.
func (c *configuration) GetZendeskURL() string {
	return "https://" + c.ZendeskSubdomain + ".zendesk.com"
}

// GetZendeskSubdomain returns the configured Zendesk subdomain.
func (c *configuration) GetZendeskSubdomain() string {
	return c.ZendeskSubdomain
}

// Clone shallow copies the configuration. Your implementation may require a deep copy if
// your configuration has reference types.
func (c *configuration) Clone() *configuration {
	clone := *c
	return &clone
}

// getConfiguration retrieves the active configuration under lock, making it safe to use
// concurrently. The active configuration may change underneath the client of this method, but
// the struct returned by this API call is considered immutable.
func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{}
	}

	return p.configuration
}

// setConfiguration replaces the active configuration under lock.
//
// Do not call setConfiguration while holding the configurationLock, as sync.Mutex is not
// reentrant. In particular, avoid using the plugin API entirely, as this may in turn trigger a
// hook back into the plugin. If that hook attempts to acquire this lock, a deadlock may occur.
//
// This method panics if setConfiguration is called with the existing configuration. This almost
// certainly means that the configuration was modified without being cloned and may result in
// an unsafe access.
func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

// OnConfigurationChange is invoked when configuration changes may have been made.
func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	// Load the public configuration fields from the Mattermost server configuration.
	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	p.setConfiguration(configuration)

	return nil
}
