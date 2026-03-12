package zendesk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
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
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
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

	resp, err := c.HTTPClient.Do(req) //nolint:gosec // URL is constructed from admin-configured Zendesk subdomain + fixed API paths
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB limit
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

// GetUser retrieves a single Zendesk user by ID.
func (c *Client) GetUser(id int64) (*User, error) {
	data, err := c.doRequest(http.MethodGet, fmt.Sprintf("/api/v2/users/%d.json", id), nil)
	if err != nil {
		return nil, err
	}

	var result UserResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %w", err)
	}
	return &result.User, nil
}

// SearchUsers searches for Zendesk users matching the query.
func (c *Client) SearchUsers(query string) (*UserSearchResult, error) {
	path := fmt.Sprintf("/api/v2/users/search.json?query=%s", url.QueryEscape(query))
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result UserSearchResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode user search response: %w", err)
	}
	return &result, nil
}

// GetOrganization retrieves a single Zendesk organization by ID.
func (c *Client) GetOrganization(id int64) (*Organization, error) {
	data, err := c.doRequest(http.MethodGet, fmt.Sprintf("/api/v2/organizations/%d.json", id), nil)
	if err != nil {
		return nil, err
	}

	var result OrganizationResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode organization response: %w", err)
	}
	return &result.Organization, nil
}

// SearchOrganizations searches for Zendesk organizations matching the query.
func (c *Client) SearchOrganizations(query string) (*OrganizationSearchResult, error) {
	path := fmt.Sprintf("/api/v2/search.json?query=%s", url.QueryEscape("type:organization "+query))
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result OrganizationSearchResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode organization search response: %w", err)
	}
	return &result, nil
}

// GetViews returns all active Zendesk views accessible to the authenticated user.
func (c *Client) GetViews() ([]View, error) {
	data, err := c.doRequest(http.MethodGet, "/api/v2/views.json", nil)
	if err != nil {
		return nil, err
	}

	var result ViewListResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode views response: %w", err)
	}

	// Filter to active views only
	active := make([]View, 0, len(result.Views))
	for _, v := range result.Views {
		if v.Active {
			active = append(active, v)
		}
	}
	return active, nil
}

// GetViewTickets returns tickets belonging to a specific Zendesk view.
func (c *Client) GetViewTickets(viewID int64) ([]Ticket, error) {
	path := fmt.Sprintf("/api/v2/views/%d/tickets.json", viewID)
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result ViewTicketsResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode view tickets response: %w", err)
	}
	return result.Tickets, nil
}

// GetTicketComments returns all comments for a ticket in chronological order.
func (c *Client) GetTicketComments(ticketID int64) ([]Comment, error) {
	path := fmt.Sprintf("/api/v2/tickets/%d/comments.json?sort_order=asc", ticketID)
	data, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var result CommentsResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode comments response: %w", err)
	}
	return result.Comments, nil
}

// UpdateTicket updates a ticket's fields (assignee, requester, etc.).
func (c *Client) UpdateTicket(ticketID int64, req *TicketUpdateRequest) (*Ticket, error) {
	data, err := c.doRequest(http.MethodPut, fmt.Sprintf("/api/v2/tickets/%d.json", ticketID), req)
	if err != nil {
		return nil, err
	}

	var result TicketResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode ticket response: %w", err)
	}
	return &result.Ticket, nil
}

// UpdateTicketRaw updates a ticket using a raw request body (map), allowing explicit null values.
func (c *Client) UpdateTicketRaw(ticketID int64, body any) (*Ticket, error) {
	data, err := c.doRequest(http.MethodPut, fmt.Sprintf("/api/v2/tickets/%d.json", ticketID), body)
	if err != nil {
		return nil, err
	}

	var result TicketResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to decode ticket response: %w", err)
	}
	return &result.Ticket, nil
}

// AddTicketComment adds a public reply or internal note to a ticket, optionally updating the status.
func (c *Client) AddTicketComment(ticketID int64, body string, public bool, status string) error {
	req := &TicketUpdateRequest{
		Ticket: TicketUpdateBody{
			Status: status,
		},
	}
	if strings.TrimSpace(body) != "" {
		req.Ticket.Comment = &CommentInput{
			Body:   body,
			Public: public,
		}
	}
	_, err := c.doRequest(http.MethodPut, fmt.Sprintf("/api/v2/tickets/%d.json", ticketID), req)
	return err
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
