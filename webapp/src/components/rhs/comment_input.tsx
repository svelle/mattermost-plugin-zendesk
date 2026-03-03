import React, {useState, useCallback} from 'react';

import {addTicketComment} from '../../api/client';

interface Props {
    ticketId: number;
    onCommentAdded: () => void;
}

const CommentInput: React.FC<Props> = ({ticketId, onCommentAdded}) => {
    const [body, setBody] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = useCallback(() => {
        const trimmed = body.trim();
        if (!trimmed || submitting) {
            return;
        }

        setSubmitting(true);
        setError('');
        addTicketComment(ticketId, trimmed, isPublic)
            .then(() => {
                setBody('');
                onCommentAdded();
            })
            .catch(() => {
                setError('Failed to add comment. Please try again.');
            })
            .finally(() => {
                setSubmitting(false);
            });
    }, [body, isPublic, submitting, ticketId, onCommentAdded]);

    return (
        <div style={styles.container}>
            <div style={styles.toggleRow}>
                <button
                    onClick={() => setIsPublic(true)}
                    style={{
                        ...styles.toggleBtn,
                        ...(isPublic ? styles.toggleActive : {}),
                    }}
                >
                    {'Public reply'}
                </button>
                <button
                    onClick={() => setIsPublic(false)}
                    style={{
                        ...styles.toggleBtn,
                        ...(!isPublic ? styles.toggleActiveInternal : {}),
                    }}
                >
                    {'Internal note'}
                </button>
            </div>
            <div className='zendesk-comment-input'>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={isPublic ? 'Type a public reply...' : 'Type an internal note...'}
                    disabled={submitting}
                    rows={4}
                    style={{
                        ...styles.textarea,
                        ...(isPublic ? {} : styles.textareaInternal),
                    }}
                />
            </div>
            {error && (
                <div style={styles.error}>{error}</div>
            )}
            <div style={styles.footer}>
                <button
                    onClick={handleSubmit}
                    disabled={!body.trim() || submitting}
                    style={{
                        ...styles.submitBtn,
                        ...(!body.trim() || submitting ? styles.submitBtnDisabled : {}),
                    }}
                >
                    {submitting ? 'Sending...' : (isPublic ? 'Reply' : 'Add note')}
                </button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        borderTop: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        padding: '8px 16px 10px',
        backgroundColor: 'var(--center-channel-bg)',
    },
    toggleRow: {
        display: 'flex',
        gap: '2px',
        marginBottom: '6px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.06)',
        borderRadius: '4px',
        padding: '2px',
    },
    toggleBtn: {
        flex: 1,
        padding: '4px 8px',
        border: 'none',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    toggleActive: {
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--button-bg)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    toggleActiveInternal: {
        backgroundColor: 'rgba(255, 186, 0, 0.12)',
        color: '#b5760b',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    textarea: {
        width: '100%',
        minHeight: '88px',
        padding: '8px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '13px',
        lineHeight: '1.4',
        resize: 'vertical' as const,
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const,
    },
    textareaInternal: {
        borderColor: '#e9ab12',
        backgroundColor: 'rgba(255, 186, 0, 0.04)',
    },
    error: {
        fontSize: '12px',
        color: '#cc3340',
        marginTop: '4px',
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: '6px',
    },
    submitBtn: {
        padding: '5px 16px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
    },
    submitBtnDisabled: {
        opacity: 0.5,
        cursor: 'default',
    },
};

export default CommentInput;
