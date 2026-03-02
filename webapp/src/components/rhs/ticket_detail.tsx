import React, {useEffect, useState, useCallback} from 'react';

import type {Ticket, ZendeskUser} from '../../api/client';
import {getTicket, getUser, getOrganization} from '../../api/client';
import {STATUS_COLORS, PRIORITY_COLORS} from '../../constants';

import CommentInput from './comment_input';
import CommentThread from './comment_thread';

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
    const [orgName, setOrgName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentRefresh, setCommentRefresh] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError('');
        setRequester(null);
        setAssignee(null);
        setOrgName(null);
        getTicket(ticketId)
            .then((result) => {
                setTicket(result.ticket);

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
                            .then((r) => setOrgName(r.organization.name))
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

    const handleCommentAdded = useCallback(() => {
        setCommentRefresh((prev) => prev + 1);
    }, []);

    const zendeskURL = ticket?.html_url ||
        (subdomain ? `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}` : '');

    const handleCopyLink = useCallback(() => {
        if (zendeskURL) {
            navigator.clipboard.writeText(zendeskURL);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [zendeskURL]);

    const statusColor = ticket ? (STATUS_COLORS[ticket.status] || '#68737d') : '#68737d';
    const priorityColor = ticket?.priority ? (PRIORITY_COLORS[ticket.priority] || '#68737d') : '#68737d';

    const getAssigneeName = () => {
        if (!ticket) {
            return null;
        }
        if (ticket.assignee_id === ticket.requester_id && requester) {
            return requester.name;
        }
        return assignee ? assignee.name : `User #${ticket.assignee_id}`;
    };

    return (
        <div style={styles.container}>
            {/* Header bar */}
            <div style={styles.headerBar} className='zendesk-back-button'>
                <button
                    onClick={onBack}
                    style={styles.backBtn}
                >
                    <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                    >
                        <path d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'/>
                    </svg>
                </button>
                <span style={styles.headerTitle}>
                    {'Ticket #'}{ticketId}
                </span>
                {ticket && (
                    <span style={{...styles.headerBadge, backgroundColor: statusColor}}>
                        {ticket.status}
                    </span>
                )}
            </div>

            {loading && (
                <div style={styles.message}>{'Loading ticket...'}</div>
            )}

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {ticket && !loading && (
                <div style={styles.scrollArea}>
                    {/* Subject */}
                    <h3 style={styles.subject}>{ticket.subject}</h3>

                    {/* Metadata card */}
                    <div style={styles.metaCard}>
                        {ticket.priority && (
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>{'Priority'}</span>
                                <span style={{
                                    ...styles.metaBadge,
                                    backgroundColor: priorityColor,
                                }}>
                                    {ticket.priority}
                                </span>
                            </div>
                        )}
                        {ticket.type && (
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>{'Type'}</span>
                                <span style={styles.metaValue}>{ticket.type}</span>
                            </div>
                        )}
                        {ticket.requester_id > 0 && (
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>{'Requester'}</span>
                                <button
                                    onClick={() => onUserClick(ticket.requester_id)}
                                    style={styles.linkButton}
                                >
                                    {requester ? requester.name : `User #${ticket.requester_id}`}
                                </button>
                            </div>
                        )}
                        {ticket.assignee_id > 0 && (
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>{'Assignee'}</span>
                                <button
                                    onClick={() => onUserClick(ticket.assignee_id)}
                                    style={styles.linkButton}
                                >
                                    {getAssigneeName()}
                                </button>
                            </div>
                        )}
                        {ticket.organization_id > 0 && (
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>{'Organization'}</span>
                                <button
                                    onClick={() => onOrgClick(ticket.organization_id)}
                                    style={styles.linkButton}
                                >
                                    {orgName || `Org #${ticket.organization_id}`}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Timestamps */}
                    <div style={styles.timestamps}>
                        <span>{'Created '}{new Date(ticket.created_at).toLocaleString()}</span>
                        <span>{'Updated '}{new Date(ticket.updated_at).toLocaleString()}</span>
                    </div>

                    {/* Tags */}
                    {ticket.tags && ticket.tags.length > 0 && (
                        <div style={styles.tagsRow}>
                            {ticket.tags.map((tag) => (
                                <span
                                    key={tag}
                                    style={styles.tag}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions row */}
                    <div style={styles.actionsRow}>
                        {zendeskURL && (
                            <a
                                href={zendeskURL}
                                target='_blank'
                                rel='noopener noreferrer'
                                style={styles.primaryAction}
                            >
                                {'Open in Zendesk'}
                            </a>
                        )}
                        {zendeskURL && (
                            <button
                                onClick={handleCopyLink}
                                style={styles.secondaryAction}
                                className='zendesk-btn-secondary'
                            >
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                        )}
                    </div>

                    {/* Comment thread */}
                    <CommentThread
                        ticketId={ticketId}
                        refreshTrigger={commentRefresh}
                    />
                </div>
            )}

            {/* Comment input - pinned at bottom */}
            {ticket && !loading && (
                <CommentInput
                    ticketId={ticketId}
                    onCommentAdded={handleCommentAdded}
                />
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
    headerBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        minHeight: '40px',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        borderRadius: '4px',
        background: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.64)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
    },
    headerTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    headerBadge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
        flexShrink: 0,
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
    scrollArea: {
        padding: '16px',
        overflowY: 'auto',
        flex: 1,
    },
    subject: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        lineHeight: '1.3',
        margin: '0 0 12px',
    },
    metaCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px',
        borderRadius: '4px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
        marginBottom: '8px',
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
    },
    metaValue: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        textTransform: 'capitalize' as const,
    },
    metaBadge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
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
    timestamps: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        marginBottom: '10px',
    },
    tagsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginBottom: '12px',
    },
    tag: {
        padding: '2px 8px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '10px',
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.72)',
    },
    actionsRow: {
        display: 'flex',
        gap: '8px',
        marginBottom: '4px',
    },
    primaryAction: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: 600,
    },
    secondaryAction: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        backgroundColor: 'transparent',
        color: 'var(--center-channel-color)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
    },
};

export default TicketDetail;
