import React, {useEffect, useState} from 'react';

import type {Ticket} from '../../api/client';
import {getMyTickets} from '../../api/client';

interface Props {
    connected: boolean;
    subdomain?: string;
}

const statusColors: Record<string, string> = {
    new: '#1f73b7',
    open: '#e9ab12',
    pending: '#ad5918',
    hold: '#8c232c',
    solved: '#2e8738',
    closed: '#68737d',
};

const MyTickets: React.FC<Props> = ({connected, subdomain}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!connected) {
            return;
        }

        setLoading(true);
        setError('');
        getMyTickets().
            then((result) => {
                setTickets(result.tickets || []);
            }).
            catch(() => {
                setError('Failed to load tickets');
            }).
            finally(() => {
                setLoading(false);
            });
    }, [connected]);

    if (!connected) {
        return null;
    }

    const getTicketUrl = (ticketId: number) => {
        if (subdomain) {
            return `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`;
        }
        return '#';
    };

    return (
        <div style={styles.container}>
            <h4 style={styles.title}>{'My Tickets'}</h4>
            {loading && <span style={styles.loadingText}>{'Loading tickets...'}</span>}
            {error && <span style={styles.errorText}>{error}</span>}
            {!loading && !error && tickets.length === 0 && (
                <span style={styles.emptyText}>{'No tickets assigned to you'}</span>
            )}
            <div style={styles.list}>
                {tickets.map((ticket) => (
                    <a
                        key={ticket.id}
                        href={getTicketUrl(ticket.id)}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={styles.ticketRow}
                    >
                        <div style={styles.ticketHeader}>
                            <span style={styles.ticketId}>{`#${ticket.id}`}</span>
                            <span
                                style={{
                                    ...styles.statusBadge,
                                    backgroundColor: statusColors[ticket.status] || '#87929d',
                                }}
                            >
                                {ticket.status}
                            </span>
                        </div>
                        <span style={styles.ticketSubject}>
                            {ticket.subject.length > 60 ? ticket.subject.substring(0, 60) + '...' : ticket.subject}
                        </span>
                        {ticket.priority && (
                            <span style={styles.ticketPriority}>{ticket.priority}</span>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '12px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    title: {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 8px',
        color: 'var(--center-channel-color)',
    },
    loadingText: {
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    errorText: {
        color: 'var(--error-text)',
        fontSize: '13px',
    },
    emptyText: {
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
    },
    ticketRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px',
        borderRadius: '4px',
        textDecoration: 'none',
        color: 'var(--center-channel-color)',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
        cursor: 'pointer',
    },
    ticketHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ticketId: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '1px 6px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
    },
    ticketSubject: {
        fontSize: '13px',
        lineHeight: '1.3',
    },
    ticketPriority: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'capitalize' as const,
    },
};

export default MyTickets;
