import React from 'react';

import type {Ticket} from '../../api/client';
import {STATUS_COLORS, PRIORITY_COLORS} from '../../constants';

interface Props {
    ticket: Ticket;
    requesterName?: string;
    onClick?: (ticket: Ticket) => void;
}

const TicketRow: React.FC<Props> = ({ticket, requesterName, onClick}) => {
    const statusColor = STATUS_COLORS[ticket.status] || '#68737d';
    const priorityColor = ticket.priority ? (PRIORITY_COLORS[ticket.priority] || '#68737d') : undefined;

    return (
        <div
            className='zendesk-ticket-row'
            style={{
                ...styles.row,
                borderLeft: `4px solid ${statusColor}`,
            }}
            onClick={() => onClick?.(ticket)}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick?.(ticket);
                }
            }}
        >
            <div style={styles.topLine}>
                <span style={styles.id}>{'#'}{ticket.id}</span>
                <span
                    style={{
                        ...styles.status,
                        backgroundColor: statusColor,
                    }}
                >
                    {ticket.status}
                </span>
            </div>
            <div style={styles.subject}>{ticket.subject}</div>
            <div style={styles.meta}>
                <div style={styles.metaLeft}>
                    {requesterName && (
                        <span style={styles.requester}>{requesterName}</span>
                    )}
                    {ticket.priority && (
                        <span
                            style={{
                                ...styles.priorityBadge,
                                color: priorityColor,
                                borderColor: priorityColor,
                            }}
                        >
                            {ticket.priority}
                        </span>
                    )}
                </div>
                <span style={styles.updated}>
                    {formatRelativeDate(ticket.updated_at)}
                </span>
            </div>
        </div>
    );
};

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
}

const styles: Record<string, React.CSSProperties> = {
    row: {
        padding: '8px 12px 8px 12px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        cursor: 'pointer',
    },
    topLine: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2px',
    },
    id: {
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontWeight: 500,
    },
    status: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#fff',
        padding: '1px 6px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
    },
    subject: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        fontWeight: 500,
        lineHeight: '1.3',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    meta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '4px',
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    metaLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflow: 'hidden',
    },
    requester: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        maxWidth: '120px',
    },
    priorityBadge: {
        fontSize: '10px',
        fontWeight: 600,
        padding: '0px 4px',
        borderRadius: '3px',
        border: '1px solid',
        textTransform: 'capitalize' as const,
    },
    updated: {
        flexShrink: 0,
    },
};

export default TicketRow;
