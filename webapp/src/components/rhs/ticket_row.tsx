import React from 'react';

import type {Ticket} from '../../api/client';
import {STATUS_COLORS} from '../../constants';

interface Props {
    ticket: Ticket;
    onClick?: (ticket: Ticket) => void;
}

const TicketRow: React.FC<Props> = ({ticket, onClick}) => {
    const statusColor = STATUS_COLORS[ticket.status] || '#68737d';

    return (
        <div
            style={styles.row}
            onClick={() => onClick?.(ticket)}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick?.(ticket);
                }
            }}
        >
            <div style={styles.header}>
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
                {ticket.priority && (
                    <span style={styles.priority}>{ticket.priority}</span>
                )}
                <span style={styles.updated}>
                    {new Date(ticket.updated_at).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    row: {
        padding: '8px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        cursor: 'pointer',
        transition: 'background 0.1s',
    },
    header: {
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
        borderRadius: '8px',
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
        gap: '8px',
        marginTop: '2px',
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    priority: {
        textTransform: 'capitalize' as const,
    },
    updated: {},
};

export default TicketRow;
