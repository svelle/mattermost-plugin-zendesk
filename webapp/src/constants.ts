export const TICKET_STATUSES = ['new', 'open', 'pending', 'hold', 'solved', 'closed'] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const STATUS_COLORS: Record<string, string> = {
    new: '#03363d',
    open: '#cc3340',
    pending: '#1f73b7',
    hold: '#68737d',
    solved: '#2f3941',
    closed: '#87929d',
};

export const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#cc3340',
    high: '#e35205',
    normal: '#1f73b7',
    low: '#68737d',
};
