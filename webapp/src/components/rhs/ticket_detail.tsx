import React, {useEffect, useState} from 'react';

import type {Ticket} from '../../api/client';
import {getTicket} from '../../api/client';
import {STATUS_COLORS, PRIORITY_COLORS} from '../../constants';

interface Props {
    ticketId: number;
    subdomain?: string;
    onBack: () => void;
}

const TicketDetail: React.FC<Props> = ({ticketId, subdomain, onBack}) => {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        getTicket(ticketId)
            .then((result) => {
                setTicket(result.ticket);
            })
            .catch(() => {
                setError('Failed to load ticket');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [ticketId]);

    const statusColor = ticket ? (STATUS_COLORS[ticket.status] || '#68737d') : '#68737d';
    const priorityColor = ticket?.priority ? (PRIORITY_COLORS[ticket.priority] || '#68737d') : '#68737d';

    const zendeskURL = ticket?.html_url ||
        (subdomain ? `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}` : '');

    return (
        <div style={styles.container}>
            <button
                onClick={onBack}
                style={styles.backButton}
            >
                <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                >
                    <path d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'/>
                </svg>
                {'Back'}
            </button>

            {loading && (
                <div style={styles.message}>{'Loading ticket...'}</div>
            )}

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {ticket && !loading && (
                <div style={styles.detail}>
                    <div style={styles.ticketHeader}>
                        <span style={styles.ticketId}>{'#'}{ticket.id}</span>
                        <span
                            style={{
                                ...styles.badge,
                                backgroundColor: statusColor,
                            }}
                        >
                            {ticket.status}
                        </span>
                    </div>

                    <h3 style={styles.subject}>{ticket.subject}</h3>

                    <div style={styles.fields}>
                        {ticket.priority && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Priority'}</span>
                                <span
                                    style={{
                                        ...styles.badge,
                                        backgroundColor: priorityColor,
                                    }}
                                >
                                    {ticket.priority}
                                </span>
                            </div>
                        )}
                        {ticket.type && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Type'}</span>
                                <span style={styles.fieldValue}>{ticket.type}</span>
                            </div>
                        )}
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Created'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(ticket.created_at).toLocaleString()}
                            </span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Updated'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(ticket.updated_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {ticket.description && (
                        <div style={styles.descriptionSection}>
                            <div style={styles.descriptionLabel}>{'Description'}</div>
                            <div style={styles.description}>{ticket.description}</div>
                        </div>
                    )}

                    {zendeskURL && (
                        <a
                            href={zendeskURL}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={styles.openLink}
                        >
                            {'Open in Zendesk'}
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '10px 16px',
        border: 'none',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        background: 'none',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--button-bg)',
        cursor: 'pointer',
    },
    message: {
        padding: '24px 16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    error: {
        padding: '24px 16px',
        textAlign: 'center',
        color: '#cc3340',
        fontSize: '13px',
    },
    detail: {
        padding: '16px',
        overflowY: 'auto',
        flex: 1,
    },
    ticketHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
    },
    ticketId: {
        fontSize: '13px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontWeight: 500,
    },
    badge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
    },
    subject: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        lineHeight: '1.3',
        margin: '0 0 16px',
    },
    fields: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
    },
    field: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
    },
    fieldValue: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        textTransform: 'capitalize' as const,
    },
    descriptionSection: {
        borderTop: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        paddingTop: '12px',
    },
    descriptionLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
        marginBottom: '6px',
    },
    description: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    openLink: {
        display: 'block',
        textAlign: 'center',
        padding: '10px 16px',
        marginTop: '16px',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 600,
    },
};

export default TicketDetail;
