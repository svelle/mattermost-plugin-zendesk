import manifest from 'manifest';

const pluginApiBase = `/plugins/${manifest.id}/api/v1`;

async function doFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const resp = await fetch(pluginApiBase + url, {
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        ...options,
    });

    if (!resp.ok) {
        throw new Error(`API request failed: ${resp.statusText}`);
    }

    return resp.json() as Promise<T>;
}

export interface Ticket {
    id: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    type: string;
    requester_id: number;
    assignee_id: number;
    organization_id: number;
    group_id: number;
    tags?: string[];
    created_at: string;
    updated_at: string;
    html_url?: string;
}

export interface Article {
    id: number;
    title: string;
    body: string;
    html_url: string;
    updated_at: string;
}

export interface ZendeskView {
    id: number;
    title: string;
    active: boolean;
    description: string;
}

export interface ZendeskUser {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    organization_id: number;
    time_zone?: string;
    details?: string;
    notes?: string;
    active: boolean;
    verified: boolean;
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface ZendeskOrganization {
    id: number;
    name: string;
    details?: string;
    notes?: string;
    domain_names?: string[];
    tags?: string[];
    group_id: number;
    created_at: string;
    updated_at: string;
}

export interface ConnectionStatus {
    connected: boolean;
    subdomain?: string;
    user?: {
        name: string;
        email: string;
    };
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
    return doFetch<ConnectionStatus>('/user/connected');
}

export async function disconnect(): Promise<void> {
    await doFetch<Record<string, string>>('/user/disconnect', {method: 'POST'});
}

export async function getMyTickets(): Promise<{tickets: Ticket[]}> {
    return doFetch<{tickets: Ticket[]}>('/tickets/mine');
}

export async function searchTickets(query: string): Promise<{tickets: Ticket[]; count: number}> {
    return doFetch<{tickets: Ticket[]; count: number}>(`/tickets/search?q=${encodeURIComponent(query)}`);
}

export async function getTicket(ticketId: number): Promise<{ticket: Ticket}> {
    return doFetch<{ticket: Ticket}>(`/tickets/${ticketId}`);
}

export async function searchArticles(query: string): Promise<{articles: Article[]; count: number}> {
    return doFetch<{articles: Article[]; count: number}>(`/articles/search?q=${encodeURIComponent(query)}`);
}

export async function getViews(): Promise<{views: ZendeskView[]}> {
    return doFetch<{views: ZendeskView[]}>('/views');
}

export async function getViewTickets(viewId: number): Promise<{tickets: Ticket[]}> {
    return doFetch<{tickets: Ticket[]}>(`/views/${viewId}/tickets`);
}

export async function getUser(userId: number): Promise<{user: ZendeskUser}> {
    return doFetch<{user: ZendeskUser}>(`/users/${userId}`);
}

export async function searchUsers(query: string): Promise<{users: ZendeskUser[]; count: number}> {
    return doFetch<{users: ZendeskUser[]; count: number}>(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function getOrganization(orgId: number): Promise<{organization: ZendeskOrganization}> {
    return doFetch<{organization: ZendeskOrganization}>(`/organizations/${orgId}`);
}

export async function searchOrganizations(query: string): Promise<{organizations: ZendeskOrganization[]; count: number}> {
    return doFetch<{organizations: ZendeskOrganization[]; count: number}>(`/organizations/search?q=${encodeURIComponent(query)}`);
}

export interface TicketComment {
    id: number;
    body: string;
    html_body: string;
    public: boolean;
    author_id: number;
    created_at: string;
}

export async function getTicketComments(ticketId: number): Promise<{comments: TicketComment[]}> {
    return doFetch<{comments: TicketComment[]}>(`/tickets/${ticketId}/comments`);
}

export async function addTicketComment(ticketId: number, body: string, isPublic: boolean): Promise<void> {
    await doFetch<Record<string, string>>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({body, public: isPublic}),
    });
}

export async function createTicketFromPost(postId: string, channelId: string, triggerId: string): Promise<void> {
    await doFetch<Record<string, string>>('/actions/create-ticket-from-post', {
        method: 'POST',
        body: JSON.stringify({
            post_id: postId,
            channel_id: channelId,
            trigger_id: triggerId,
        }),
    });
}

export interface CreateTicketRequest {
    subject: string;
    description: string;
    priority: string;
    type: string;
    post_id: string;
    channel_id: string;
    assignee_id?: number;
    requester_id?: number;
}

export async function createTicket(req: CreateTicketRequest): Promise<{ticket_id: number; ticket_url: string}> {
    return doFetch<{ticket_id: number; ticket_url: string}>('/tickets/create', {
        method: 'POST',
        body: JSON.stringify(req),
    });
}

export async function attachPostToTicket(
    ticketId: number,
    postId: string,
    channelId: string,
    isPublic: boolean,
): Promise<void> {
    await doFetch<Record<string, string>>('/actions/attach-post-to-ticket', {
        method: 'POST',
        body: JSON.stringify({
            ticket_id: ticketId,
            post_id: postId,
            channel_id: channelId,
            public: isPublic,
        }),
    });
}

export async function updateTicket(
    ticketId: number,
    fields: {assignee_id?: number | null; requester_id?: number | null},
): Promise<{ticket: Ticket}> {
    return doFetch<{ticket: Ticket}>(`/tickets/${ticketId}/update`, {
        method: 'POST',
        body: JSON.stringify(fields),
    });
}
