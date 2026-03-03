package kvstore

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/pkg/errors"
)

const (
	oauthStatePrefix     = "oauth_state_"
	oauthTokenPrefix     = "oauth_token_"
	zendeskUserPrefix    = "zendesk_user_"
	subscriptionPrefix   = "sub_"
	subscriptionIndex    = "sub_index"
	oauthStateTTLSeconds = 600 // 10 minutes
)

// Client implements the KVStore interface using the Mattermost plugin KV store.
type Client struct {
	client *pluginapi.Client
	subMu  sync.Mutex // serializes subscription index read-modify-write operations
}

// NewKVStore creates a new KV store client.
func NewKVStore(client *pluginapi.Client) KVStore {
	return &Client{
		client: client,
	}
}

// StoreOAuthState stores an OAuth state token linked to a user ID with a TTL.
func (kv *Client) StoreOAuthState(state string, userID string) error {
	data := map[string]any{
		"user_id":   userID,
		"timestamp": time.Now().Unix(),
	}

	_, err := kv.client.KV.Set(oauthStatePrefix+state, data, pluginapi.SetExpiry(time.Duration(oauthStateTTLSeconds)*time.Second))
	if err != nil {
		return errors.Wrap(err, "failed to store OAuth state")
	}
	return nil
}

// GetAndDeleteOAuthState retrieves and removes an OAuth state token, returning the associated user ID.
func (kv *Client) GetAndDeleteOAuthState(state string) (string, error) {
	key := oauthStatePrefix + state
	var data map[string]any
	err := kv.client.KV.Get(key, &data)
	if err != nil {
		return "", errors.Wrap(err, "failed to get OAuth state")
	}
	if data == nil {
		return "", errors.New("OAuth state not found or expired")
	}

	// Delete the state after retrieval
	_ = kv.client.KV.Delete(key)

	userID, ok := data["user_id"].(string)
	if !ok {
		return "", errors.New("invalid OAuth state data")
	}
	return userID, nil
}

// StoreOAuthToken stores an encrypted OAuth token for a user.
func (kv *Client) StoreOAuthToken(userID string, token *OAuthToken) error {
	_, err := kv.client.KV.Set(oauthTokenPrefix+userID, token)
	if err != nil {
		return errors.Wrap(err, "failed to store OAuth token")
	}
	return nil
}

// GetOAuthToken retrieves the OAuth token for a user.
func (kv *Client) GetOAuthToken(userID string) (*OAuthToken, error) {
	var token OAuthToken
	err := kv.client.KV.Get(oauthTokenPrefix+userID, &token)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get OAuth token")
	}
	if token.AccessToken == "" {
		return nil, nil
	}
	return &token, nil
}

// DeleteOAuthToken removes the OAuth token for a user.
func (kv *Client) DeleteOAuthToken(userID string) error {
	err := kv.client.KV.Delete(oauthTokenPrefix + userID)
	if err != nil {
		return errors.Wrap(err, "failed to delete OAuth token")
	}
	return nil
}

// StoreZendeskUser stores cached Zendesk user info linked to a Mattermost user.
func (kv *Client) StoreZendeskUser(userID string, zdUser *ZendeskUserInfo) error {
	_, err := kv.client.KV.Set(zendeskUserPrefix+userID, zdUser)
	if err != nil {
		return errors.Wrap(err, "failed to store Zendesk user")
	}
	return nil
}

// GetZendeskUser retrieves cached Zendesk user info for a Mattermost user.
func (kv *Client) GetZendeskUser(userID string) (*ZendeskUserInfo, error) {
	var zdUser ZendeskUserInfo
	err := kv.client.KV.Get(zendeskUserPrefix+userID, &zdUser)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get Zendesk user")
	}
	if zdUser.ZendeskUserID == 0 {
		return nil, nil
	}
	return &zdUser, nil
}

// DeleteZendeskUser removes cached Zendesk user info for a Mattermost user.
func (kv *Client) DeleteZendeskUser(userID string) error {
	err := kv.client.KV.Delete(zendeskUserPrefix + userID)
	if err != nil {
		return errors.Wrap(err, "failed to delete Zendesk user")
	}
	return nil
}

// StoreSubscription stores a channel subscription and updates the index.
func (kv *Client) StoreSubscription(sub *Subscription) error {
	kv.subMu.Lock()
	defer kv.subMu.Unlock()

	_, err := kv.client.KV.Set(subscriptionPrefix+sub.ChannelID, sub)
	if err != nil {
		return errors.Wrap(err, "failed to store subscription")
	}

	// Update the index
	index, err := kv.getSubscriptionIndex()
	if err != nil {
		return err
	}

	// Add channel ID if not already present
	found := false
	for _, id := range index {
		if id == sub.ChannelID {
			found = true
			break
		}
	}
	if !found {
		index = append(index, sub.ChannelID)
		if err := kv.setSubscriptionIndex(index); err != nil {
			return err
		}
	}

	return nil
}

// GetSubscription retrieves a channel's subscription.
func (kv *Client) GetSubscription(channelID string) (*Subscription, error) {
	var sub Subscription
	err := kv.client.KV.Get(subscriptionPrefix+channelID, &sub)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get subscription")
	}
	if sub.ChannelID == "" {
		return nil, nil
	}
	return &sub, nil
}

// DeleteSubscription removes a channel's subscription and updates the index.
func (kv *Client) DeleteSubscription(channelID string) error {
	kv.subMu.Lock()
	defer kv.subMu.Unlock()

	err := kv.client.KV.Delete(subscriptionPrefix + channelID)
	if err != nil {
		return errors.Wrap(err, "failed to delete subscription")
	}

	// Update the index
	index, err := kv.getSubscriptionIndex()
	if err != nil {
		return err
	}

	newIndex := make([]string, 0, len(index))
	for _, id := range index {
		if id != channelID {
			newIndex = append(newIndex, id)
		}
	}
	return kv.setSubscriptionIndex(newIndex)
}

// ListSubscriptions returns all active subscriptions.
func (kv *Client) ListSubscriptions() ([]*Subscription, error) {
	// Hold the mutex only long enough to read the index, then release it before
	// doing the per-channel KV reads to avoid holding the lock during slow I/O.
	kv.subMu.Lock()
	index, err := kv.getSubscriptionIndex()
	kv.subMu.Unlock()

	if err != nil {
		return nil, err
	}

	subs := make([]*Subscription, 0, len(index))
	for _, channelID := range index {
		sub, err := kv.GetSubscription(channelID)
		if err != nil {
			continue
		}
		if sub != nil {
			subs = append(subs, sub)
		}
	}
	return subs, nil
}

func (kv *Client) getSubscriptionIndex() ([]string, error) {
	var data []byte
	err := kv.client.KV.Get(subscriptionIndex, &data)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get subscription index")
	}
	if data == nil {
		return []string{}, nil
	}

	var index []string
	if err := json.Unmarshal(data, &index); err != nil {
		return []string{}, nil
	}
	return index, nil
}

func (kv *Client) setSubscriptionIndex(index []string) error {
	_, err := kv.client.KV.Set(subscriptionIndex, index)
	if err != nil {
		return errors.Wrap(err, "failed to set subscription index")
	}
	return nil
}
