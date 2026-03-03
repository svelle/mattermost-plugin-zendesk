import React, {useEffect, useState} from 'react';

import type {TicketComment} from '../../api/client';
import {getTicketComments, getUser} from '../../api/client';

interface Props {
    ticketId: number;
    requesterId?: number;
    refreshTrigger: number;
}

const CommentThread: React.FC<Props> = ({ticketId, requesterId, refreshTrigger}) => {
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [authorNames, setAuthorNames] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        getTicketComments(ticketId)
            .then((result) => {
                setComments(result.comments || []);
            })
            .catch(() => {
                setError('Failed to load comments');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [ticketId, refreshTrigger]);

    // Resolve author names
    useEffect(() => {
        if (comments.length === 0) {
            return;
        }

        const uniqueIds = [...new Set(
            comments
                .map((c) => c.author_id)
                .filter((id) => id > 0 && !authorNames[id]),
        )];

        if (uniqueIds.length === 0) {
            return;
        }

        Promise.allSettled(
            uniqueIds.map((id) =>
                getUser(id).then((r) => ({id, name: r.user.name})),
            ),
        ).then((results) => {
            const newNames: Record<number, string> = {};
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    newNames[result.value.id] = result.value.name;
                }
            }
            if (Object.keys(newNames).length > 0) {
                setAuthorNames((prev) => ({...prev, ...newNames}));
            }
        });
    }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <div style={styles.message}>{'Loading comments...'}</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

    if (comments.length === 0) {
        return <div style={styles.message}>{'No comments yet'}</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                {'Comments'}
                <span style={styles.count}>{comments.length}</span>
            </div>
            {comments.map((comment) => {
                const isRequester = requesterId != null && comment.author_id === requesterId;
                const isInternal = !comment.public;

                let commentStyle: React.CSSProperties = {...styles.comment};
                if (isInternal) {
                    commentStyle = {...commentStyle, ...styles.internalComment};
                } else if (isRequester) {
                    commentStyle = {...commentStyle, ...styles.requesterComment};
                } else {
                    commentStyle = {...commentStyle, ...styles.agentComment};
                }

                return (
                    <div
                        key={comment.id}
                        className={isInternal ? 'zendesk-comment-internal' : undefined}
                        style={commentStyle}
                    >
                        <div style={styles.commentHeader}>
                            <div style={styles.authorInfo}>
                                <span style={styles.authorName}>
                                    {authorNames[comment.author_id] || `User #${comment.author_id}`}
                                </span>
                                {isInternal && (
                                    <span style={styles.internalBadge}>{'Internal note'}</span>
                                )}
                                {!isInternal && isRequester && (
                                    <span style={styles.requesterBadge}>{'Requester'}</span>
                                )}
                            </div>
                            <span style={styles.timestamp}>
                                {formatRelativeTime(comment.created_at)}
                            </span>
                        </div>
                        <div style={styles.commentBody}>{comment.body}</div>
                    </div>
                );
            })}
        </div>
    );
};

function formatRelativeTime(dateStr: string): string {
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
    if (diffDays < 30) {
        return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 0 6px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
    },
    count: {
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        padding: '0 6px',
        borderRadius: '10px',
    },
    comment: {
        padding: '8px 10px',
        borderRadius: '4px',
        marginBottom: '4px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.03)',
    },
    requesterComment: {
        borderLeft: '3px solid var(--button-bg)',
        backgroundColor: 'rgba(var(--button-bg-rgb, 28, 88, 217), 0.04)',
    },
    agentComment: {
        borderLeft: '3px solid rgba(var(--center-channel-color-rgb), 0.24)',
    },
    internalComment: {
        borderLeft: '3px solid #e9ab12',
        backgroundColor: 'rgba(255, 186, 0, 0.06)',
    },
    commentHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    authorInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    authorName: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
    },
    internalBadge: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#b5760b',
        backgroundColor: 'rgba(255, 186, 0, 0.15)',
        padding: '1px 6px',
        borderRadius: '3px',
    },
    requesterBadge: {
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--button-bg)',
        backgroundColor: 'rgba(var(--button-bg-rgb, 28, 88, 217), 0.08)',
        padding: '1px 6px',
        borderRadius: '3px',
    },
    timestamp: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        flexShrink: 0,
    },
    commentBody: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    message: {
        padding: '16px 0',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    error: {
        padding: '16px 0',
        textAlign: 'center',
        color: '#cc3340',
        fontSize: '13px',
    },
};

export default CommentThread;
