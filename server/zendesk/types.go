package zendesk

// Ticket represents a Zendesk support ticket.
type Ticket struct {
	ID          int64    `json:"id"`
	Subject     string   `json:"subject"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	Type        string   `json:"type"`
	RequesterID int64    `json:"requester_id"`
	AssigneeID  int64    `json:"assignee_id"`
	GroupID     int64    `json:"group_id"`
	Tags        []string `json:"tags"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
	URL         string   `json:"url"`
	HTMLURL     string   `json:"html_url,omitempty"`
}

// TicketCreateRequest is the payload for creating a new ticket.
type TicketCreateRequest struct {
	Ticket TicketCreateBody `json:"ticket"`
}

// TicketCreateBody is the body of the ticket create request.
type TicketCreateBody struct {
	Subject     string   `json:"subject"`
	Description string   `json:"comment"`
	Priority    string   `json:"priority,omitempty"`
	Type        string   `json:"type,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// TicketResponse wraps a single ticket from the Zendesk API.
type TicketResponse struct {
	Ticket Ticket `json:"ticket"`
}

// SearchResult is the response from the Zendesk search API.
type SearchResult struct {
	Results []Ticket `json:"results"`
	Count   int      `json:"count"`
}

// User represents a Zendesk user.
type User struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// UserResponse wraps a single user from the Zendesk API.
type UserResponse struct {
	User User `json:"user"`
}

// Article represents a Zendesk Help Center article.
type Article struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	HTMLURL   string `json:"html_url"`
	UpdatedAt string `json:"updated_at"`
}

// ArticleSearchResult is the response from the Help Center article search API.
type ArticleSearchResult struct {
	Results []Article `json:"results"`
	Count   int       `json:"count"`
}

// WebhookEvent represents a Zendesk webhook payload for ticket events.
type WebhookEvent struct {
	TicketID      string `json:"ticket_id"`
	TicketTitle   string `json:"ticket_title"`
	Status        string `json:"status"`
	Priority      string `json:"priority"`
	RequesterName string `json:"requester_name"`
	AssigneeName  string `json:"assignee_name"`
	GroupName     string `json:"group_name"`
	LatestComment string `json:"latest_comment"`
	EventType     string `json:"event_type"`
	TicketURL     string `json:"ticket_url"`
}

// View represents a Zendesk view (predefined ticket list).
type View struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Active      bool   `json:"active"`
	Description string `json:"description"`
}

// ViewListResponse is the response from the Zendesk views API.
type ViewListResponse struct {
	Views []View `json:"views"`
}

// ViewTicketsResponse is the response from the Zendesk view tickets API.
type ViewTicketsResponse struct {
	Tickets []Ticket `json:"tickets"`
}

// OAuthTokenResponse is the response from the Zendesk OAuth token endpoint.
type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}
