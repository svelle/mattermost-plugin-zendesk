import React, {useEffect, useState, useCallback} from 'react';

import type {Ticket, ZendeskUser, ZendeskOrganization} from '../../api/client';
import {getTicket, getUser, getOrganization} from '../../api/client';
import {STATUS_COLORS, PRIORITY_COLORS} from '../../constants';

interface Props {
    ticketId: number;
    subdomain?: string;
    onBack: () => void;
    onUserClick: (userId: number) => void;
    onOrgClick: (orgId: number) => void;
}

const TicketDetail: React.FC<Props> = ({ticketId, subdomain, onBack, onUserClick, onOrgClick}) => {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [requester, setRequester] = useState<ZendeskUser | null>(null);
    const [assignee, setAssignee] = useState<ZendeskUser | null>(null);
    const [org, setOrg] = useState<ZendeskOrganization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError('');
        setRequester(null);
        setAssignee(null);
        setOrg(null);
        getTicket(ticketId)
            .then((result) => {
                setTicket(result.ticket);

                // Fetch requester, assignee, and org names in parallel
                const fetches: Promise<void>[] = [];
                if (result.ticket.requester_id) {
                    fetches.push(
                        getUser(result.ticket.requester_id)
                            .then((r) => setRequester(r.user))
                            .catch(() => { /* ignore */ }),
                    );
                }
                if (result.ticket.assignee_id && result.ticket.assignee_id !== result.ticket.requester_id) {
                    fetches.push(
                        getUser(result.ticket.assignee_id)
                            .then((r) => setAssignee(r.user))
                            .catch(() => { /* ignore */ }),
                    );
                }
                if (result.ticket.organization_id) {
                    fetches.push(
                        getOrganization(result.ticket.organization_id)
                            .then((r) => setOrg(r.organization))
                            .catch(() => { /* ignore */ }),
                    );
                }
                return Promise.all(fetches);
            })
            .catch(() => {
                setError('Failed to load ticket');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [ticketId]);

    const zendeskURL = ticket?.html_url ||
        (subdomain ? `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}` : '');

    const handleCopyLink = useCallback(() => {
        if (!zendeskURL) {
            return;
        }
        navigator.clipboard.writeText(zendeskURL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => { /* ignore */ });
    }, [zendeskURL]);

    const statusColor = ticket ? (STATUS_COLORS[ticket.status] || '#68737d') : '#68737d';
    const priorityColor = ticket?.priority ? (PRIORITY_COLORS[ticket.priority] || '#68737d') : '#68737d';

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

                        {/* Requester */}
                        {ticket.requester_id > 0 && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Requester'}</span>
                                <button
                                    onClick={() => onUserClick(ticket.requester_id)}
                                    style={styles.linkButton}
                                >
                                    {requester ? requester.name : `User #${ticket.requester_id}`}
                                </button>
                            </div>
                        )}

                        {/* Assignee */}
                        {ticket.assignee_id > 0 && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Assignee'}</span>
                                <button
                                    onClick={() => onUserClick(ticket.assignee_id)}
                                    style={styles.linkButton}
                                >
                                    {(() => {
                                        if (ticket.assignee_id === ticket.requester_id && requester) {
                                            return requester.name;
                                        }
                                        return assignee ? assignee.name : `User #${ticket.assignee_id}`;
                                    })()}
                                </button>
                            </div>
                        )}

                        {/* Organization */}
                        {ticket.organization_id > 0 && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Organization'}</span>
                                <button
                                    onClick={() => onOrgClick(ticket.organization_id)}
                                    style={styles.linkButton}
                                >
                                    {org ? org.name : `Org #${ticket.organization_id}`}
                                </button>
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

                    {/* Tags */}
                    {ticket.tags && ticket.tags.length > 0 && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Tags'}</div>
                            <div style={styles.tags}>
                                {ticket.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        style={styles.tag}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {ticket.description && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Description'}</div>
                            <div style={styles.description}>{ticket.description}</div>
                        </div>
                    )}

                    <div style={styles.actions}>
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
                        {zendeskURL && (
                            <button
                                onClick={handleCopyLink}
                                style={styles.copyButton}
                            >
                                {copied ? (
                                    <>
                                        <svg
                                            width='14'
                                            height='14'
                                            viewBox='0 0 24 24'
                                            fill='currentColor'
                                        >
                                            <path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/>
                                        </svg>
                                        {'Copied!'}
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            width='14'
                                            height='14'
                                            viewBox='0 0 24 24'
                                            fill='currentColor'
                                        >
                                            <path d='M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'/>
                                        </svg>
                                        {'Copy ticket link'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
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
    linkButton: {
        background: 'none',
        border: 'none',
        color: 'var(--button-bg)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        padding: 0,
        textDecoration: 'underline',
    },
    section: {
        borderTop: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        paddingTop: '12px',
        marginBottom: '12px',
    },
    sectionLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
        marginBottom: '6px',
    },
    tags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
    },
    tag: {
        padding: '2px 8px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '10px',
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.72)',
    },
    description: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '16px',
    },
    openLink: {
        display: 'block',
        textAlign: 'center',
        padding: '10px 16px',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 600,
    },
    copyButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 16px',
        borderRadius: '4px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        backgroundColor: 'transparent',
        color: 'var(--center-channel-color)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
};

export default TicketDetail;
