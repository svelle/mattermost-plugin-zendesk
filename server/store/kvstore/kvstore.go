package kvstore

// OAuthToken represents a stored Zendesk OAuth token.
type OAuthToken struct {
	AccessToken string `json:"access_token"` //nolint:gosec // This is an OAuth token struct field, not a hardcoded credential
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

// ZendeskUserInfo stores cached Zendesk user information linked to a Mattermost user.
type ZendeskUserInfo struct {
	ZendeskUserID int64  `json:"zendesk_user_id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
}

// Subscription represents a channel's subscription to Zendesk events.
type Subscription struct {
	ChannelID      string   `json:"channel_id"`
	CreatorID      string   `json:"creator_id"`
	GroupFilter    string   `json:"group_filter,omitempty"`
	PriorityFilter string   `json:"priority_filter,omitempty"`
	EventTypes     []string `json:"event_types,omitempty"`
	CreatedAt      int64    `json:"created_at"`
}

// KVStore defines the interface for persisting plugin data.
type KVStore interface {
	// OAuth state management
	StoreOAuthState(state string, userID string) error
	GetAndDeleteOAuthState(state string) (string, error)

	// OAuth token management
	StoreOAuthToken(userID string, token *OAuthToken) error
	GetOAuthToken(userID string) (*OAuthToken, error)
	DeleteOAuthToken(userID string) error

	// Zendesk user info
	StoreZendeskUser(userID string, zdUser *ZendeskUserInfo) error
	GetZendeskUser(userID string) (*ZendeskUserInfo, error)
	DeleteZendeskUser(userID string) error

	// Channel subscriptions
	GetSubscription(channelID string) (*Subscription, error)
	StoreSubscription(sub *Subscription) error
	DeleteSubscription(channelID string) error
	ListSubscriptions() ([]*Subscription, error)
}
