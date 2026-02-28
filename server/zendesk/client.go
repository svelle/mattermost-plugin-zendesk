package zendesk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Client is a thin HTTP client for the Zendesk REST API.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
	Token      string
}

// NewClient creates a new Zendesk API client.
func NewClient(subdomain, token string) *Client {
	return &Client{
		BaseURL:    fmt.Sprintf("https://%s.zendesk.com", subdomain),
		HTTPClient: http.DefaultClient,
		Token:      token,
	}
}

func (c *Client) doRequest(method, path string, body any) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("zendesk API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// GetCurrentUser returns the authenticated user's information.
func (c *Client) GetCurrentUser() (*User, error) {
	data, err := c.doRequest(http.MethodGet, "/api/v2/users/me.json", nil)
	if err != nil {
		return nil, err
	}

	var result UserResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %w", err)
	}
	return &result.User, nil
}

// CreateTicket creates a new Zendesk ticket.
func (c *Client) CreateTicket(req *TicketCreateRequest) (*Ticket, error) {
	data, err := c.doRequest(http.MethodPost, "/api/v2/tickets.json", req)
	if err != nil {
		return nil, err
	}

	var result TicketResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode ticket response: %w", err)
	}
	return &result.Ticket, nil
}

// GetTicket retrieves a single ticket by ID.
func (c *Client) GetTicket(id int64) (*Ticket, error) {
	data, err := c.doRequest(http.MethodGet, fmt.Sprintf("/api/v2/tickets/%d.json", id), nil)
	if err != nil {
		return nil, err
	}

	var result TicketResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode ticket response: %w", err)
	}
	return &result.Ticket, nil
}

// SearchTickets searches for tickets matching the query.
func (c *Client) SearchTickets(query string) (*SearchResult, error) {
	path := fmt.Sprintf("/api/v2/search.json?query=%s", url.QueryEscape("type:ticket "+query))
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result SearchResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}
	return &result, nil
}

// GetMyTickets returns tickets assigned to the given Zendesk user ID.
func (c *Client) GetMyTickets(zendeskUserID int64) ([]Ticket, error) {
	query := fmt.Sprintf("type:ticket assignee:%d", zendeskUserID)
	path := fmt.Sprintf("/api/v2/search.json?query=%s&sort_by=updated_at&sort_order=desc&per_page=25", url.QueryEscape(query))
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result SearchResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}
	return result.Results, nil
}

// SearchArticles searches for Help Center articles matching the query.
func (c *Client) SearchArticles(query string) (*ArticleSearchResult, error) {
	path := fmt.Sprintf("/api/v2/help_center/articles/search.json?query=%s", url.QueryEscape(query))
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result ArticleSearchResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode article search response: %w", err)
	}
	return &result, nil
}
