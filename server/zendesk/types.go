package zendesk

// Ticket represents a Zendesk support ticket.
type Ticket struct {
	ID             int64    `json:"id"`
	Subject        string   `json:"subject"`
	Description    string   `json:"description"`
	Status         string   `json:"status"`
	Priority       string   `json:"priority"`
	Type           string   `json:"type"`
	RequesterID    int64    `json:"requester_id"`
	AssigneeID     int64    `json:"assignee_id"`
	OrganizationID int64    `json:"organization_id"`
	GroupID        int64    `json:"group_id"`
	Tags           []string `json:"tags"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
	URL            string   `json:"url"`
	HTMLURL        string   `json:"html_url,omitempty"`
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
	RequesterID int64    `json:"requester_id,omitempty"`
	AssigneeID  int64    `json:"assignee_id,omitempty"`
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
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Phone          string `json:"phone,omitempty"`
	Role           string `json:"role"`
	OrganizationID int64  `json:"organization_id"`
	TimeZone       string `json:"time_zone,omitempty"`
	Details        string `json:"details,omitempty"`
	Notes          string `json:"notes,omitempty"`
	Active         bool   `json:"active"`
	Verified       bool   `json:"verified"`
	Tags           []string `json:"tags,omitempty"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

// UserResponse wraps a single user from the Zendesk API.
type UserResponse struct {
	User User `json:"user"`
}

// UserSearchResult is the response from the Zendesk user search API.
type UserSearchResult struct {
	Users []User `json:"users"`
	Count int    `json:"count"`
}

// Organization represents a Zendesk organization.
type Organization struct {
	ID         int64    `json:"id"`
	Name       string   `json:"name"`
	Details    string   `json:"details,omitempty"`
	Notes      string   `json:"notes,omitempty"`
	DomainNames []string `json:"domain_names,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	GroupID    int64    `json:"group_id"`
	CreatedAt  string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
}

// OrganizationResponse wraps a single organization from the Zendesk API.
type OrganizationResponse struct {
	Organization Organization `json:"organization"`
}

// OrganizationSearchResult is the response from the Zendesk organization search API.
type OrganizationSearchResult struct {
	Organizations []Organization `json:"organizations,omitempty"`
	Results       []Organization `json:"results,omitempty"`
	Count         int            `json:"count"`
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

// Comment represents a single comment on a Zendesk ticket.
type Comment struct {
	ID        int64  `json:"id"`
	Body      string `json:"body"`
	HTMLBody  string `json:"html_body"`
	Public    bool   `json:"public"`
	AuthorID  int64  `json:"author_id"`
	CreatedAt string `json:"created_at"`
}

// CommentsResponse wraps the response from the ticket comments API.
type CommentsResponse struct {
	Comments []Comment `json:"comments"`
}

// TicketUpdateRequest is the payload for updating a ticket (used for adding comments).
type TicketUpdateRequest struct {
	Ticket TicketUpdateBody `json:"ticket"`
}

// TicketUpdateBody is the body of the ticket update request.
type TicketUpdateBody struct {
	Comment     *CommentInput `json:"comment,omitempty"`
	Status      string        `json:"status,omitempty"`
	RequesterID *int64        `json:"requester_id,omitempty"`
	AssigneeID  *int64        `json:"assignee_id,omitempty"`
}

// CommentInput is the comment payload when updating a ticket.
type CommentInput struct {
	Body   string `json:"body"`
	Public bool   `json:"public"`
}

// OAuthTokenResponse is the response from the Zendesk OAuth token endpoint.
type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}
