import React, {useEffect, useState, useCallback} from 'react';

import type {Ticket, ZendeskUser} from '../../api/client';
import {getTicket, getUser, getOrganization, updateTicket} from '../../api/client';
import {STATUS_COLORS, PRIORITY_COLORS} from '../../constants';
import UserSearchInput from '../user_search_input';

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
    const [editingAssignee, setEditingAssignee] = useState(false);
    const [editingRequester, setEditingRequester] = useState(false);
    const [updating, setUpdating] = useState(false);

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

    const handleAssigneeChange = useCallback(async (user: ZendeskUser | null) => {
        if (!ticket || updating) {
            return;
        }
        setUpdating(true);
        try {
            const result = await updateTicket(ticket.id, {assignee_id: user?.id ?? null});
            setTicket(result.ticket);
            if (user) {
                setAssignee(user);
            } else {
                setAssignee(null);
            }
            setEditingAssignee(false);
        } catch {
            // ignore - keep editing open
        } finally {
            setUpdating(false);
        }
    }, [ticket, updating]);

    const handleRequesterChange = useCallback(async (user: ZendeskUser | null) => {
        if (!ticket || updating) {
            return;
        }
        setUpdating(true);
        try {
            const result = await updateTicket(ticket.id, {requester_id: user?.id ?? null});
            setTicket(result.ticket);
            if (user) {
                setRequester(user);
            } else {
                setRequester(null);
            }
            setEditingRequester(false);
        } catch {
            // ignore - keep editing open
        } finally {
            setUpdating(false);
        }
    }, [ticket, updating]);

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
            {/* Header bar with subject */}
            <div style={styles.headerBar}>
                <button
                    onClick={onBack}
                    style={styles.backBtn}
                    className='zendesk-back-button'
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
                <div style={styles.headerCenter}>
                    <div style={styles.headerTitleRow}>
                        {ticket && zendeskURL ? (
                            <a
                                href={zendeskURL}
                                target='_blank'
                                rel='noopener noreferrer'
                                style={styles.headerTitleLink}
                                title={ticket.subject}
                            >
                                {ticket.subject}
                            </a>
                        ) : (
                            <span style={styles.headerTitle}>
                                {ticket ? ticket.subject : `Ticket #${ticketId}`}
                            </span>
                        )}
                    </div>
                    <div style={styles.headerMeta}>
                        <span style={styles.headerTicketId}>{'#'}{ticketId}</span>
                        {ticket && (
                            <span style={{...styles.headerBadge, backgroundColor: statusColor}}>
                                {ticket.status}
                            </span>
                        )}
                    </div>
                </div>
                {zendeskURL && (
                    <button
                        onClick={handleCopyLink}
                        style={styles.copyBtn}
                        className='zendesk-btn-secondary'
                        title={copied ? 'Copied!' : 'Copy link to clipboard'}
                    >
                        {copied ? (
                            <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2.5'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <polyline points='20 6 9 17 4 12'/>
                            </svg>
                        ) : (
                            <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <rect
                                    x='9'
                                    y='9'
                                    width='13'
                                    height='13'
                                    rx='2'
                                    ry='2'
                                />
                                <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/>
                            </svg>
                        )}
                    </button>
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
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>{'Requester'}</span>
                            {editingRequester ? (
                                <div style={styles.editFieldWrap}>
                                    <UserSearchInput
                                        selectedUser={requester}
                                        onSelect={handleRequesterChange}
                                        placeholder='Search requester...'
                                        disabled={updating}
                                    />
                                    <button
                                        onClick={() => setEditingRequester(false)}
                                        style={styles.editCancelBtn}
                                        type='button'
                                    >
                                        {'Cancel'}
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.editableValue}>
                                    {ticket.requester_id > 0 ? (
                                        <button
                                            onClick={() => onUserClick(ticket.requester_id)}
                                            style={styles.linkButton}
                                        >
                                            {requester ? requester.name : `User #${ticket.requester_id}`}
                                        </button>
                                    ) : (
                                        <span style={styles.metaValueMuted}>{'Unset'}</span>
                                    )}
                                    <button
                                        onClick={() => setEditingRequester(true)}
                                        style={styles.editBtn}
                                        title='Change requester'
                                    >
                                        <svg
                                            width='12'
                                            height='12'
                                            viewBox='0 0 24 24'
                                            fill='none'
                                            stroke='currentColor'
                                            strokeWidth='2'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        >
                                            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                                            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>{'Assignee'}</span>
                            {editingAssignee ? (
                                <div style={styles.editFieldWrap}>
                                    <UserSearchInput
                                        selectedUser={assignee}
                                        onSelect={handleAssigneeChange}
                                        placeholder='Search assignee...'
                                        disabled={updating}
                                    />
                                    <button
                                        onClick={() => setEditingAssignee(false)}
                                        style={styles.editCancelBtn}
                                        type='button'
                                    >
                                        {'Cancel'}
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.editableValue}>
                                    {ticket.assignee_id > 0 ? (
                                        <button
                                            onClick={() => onUserClick(ticket.assignee_id)}
                                            style={styles.linkButton}
                                        >
                                            {getAssigneeName()}
                                        </button>
                                    ) : (
                                        <span style={styles.metaValueMuted}>{'Unassigned'}</span>
                                    )}
                                    <button
                                        onClick={() => setEditingAssignee(true)}
                                        style={styles.editBtn}
                                        title='Change assignee'
                                    >
                                        <svg
                                            width='12'
                                            height='12'
                                            viewBox='0 0 24 24'
                                            fill='none'
                                            stroke='currentColor'
                                            strokeWidth='2'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        >
                                            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                                            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
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
                        <span>{'Created '}{new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span>{'Updated '}{new Date(ticket.updated_at).toLocaleDateString()}</span>
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

                    {/* Comment thread */}
                    <CommentThread
                        ticketId={ticketId}
                        requesterId={ticket.requester_id}
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
        height: 'calc(100% - 56px)',
    },
    headerBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
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
    headerCenter: {
        flex: 1,
        minWidth: 0,
    },
    headerTitleRow: {
        display: 'flex',
        alignItems: 'center',
    },
    headerTitleLink: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--button-bg)',
        textDecoration: 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    headerTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    headerMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '2px',
    },
    headerTicketId: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    headerBadge: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#fff',
        padding: '1px 6px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
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
    copyBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        background: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
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
    editableValue: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    editBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        border: 'none',
        borderRadius: '3px',
        background: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.4)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
    },
    editFieldWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minWidth: 0,
    },
    editCancelBtn: {
        alignSelf: 'flex-end',
        background: 'none',
        border: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        fontSize: '11px',
        padding: '0 2px',
    },
    metaValueMuted: {
        fontSize: '13px',
        color: 'rgba(var(--center-channel-color-rgb), 0.4)',
        fontStyle: 'italic',
    },
    timestamps: {
        display: 'flex',
        justifyContent: 'space-between',
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
};

export default TicketDetail;
