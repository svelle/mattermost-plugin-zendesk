import manifest from 'manifest';

const pluginApiBase = `/plugins/${manifest.id}/api/v1`;

async function doFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const resp = await fetch(pluginApiBase + url, {
        headers: {
            'Content-Type': 'application/json',
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
