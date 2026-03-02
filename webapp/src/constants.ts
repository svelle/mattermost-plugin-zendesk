export const TICKET_STATUSES = ['new', 'open', 'pending', 'hold', 'solved', 'closed'] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const STATUS_COLORS: Record<string, string> = {
    new: '#1f73b7',
    open: '#e9ab12',
    pending: '#ad5918',
    hold: '#8c232c',
    solved: '#2e8738',
    closed: '#68737d',
};

export const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#cc3340',
    high: '#e35205',
    normal: '#1f73b7',
    low: '#68737d',
};
