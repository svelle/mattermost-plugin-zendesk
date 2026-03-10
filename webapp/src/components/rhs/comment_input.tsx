import React, {useState, useCallback, useEffect, useRef} from 'react';

import {addTicketComment} from '../../api/client';
import {TICKET_STATUSES, STATUS_COLORS} from '../../constants';

interface Props {
    ticketId: number;
    currentStatus: string;
    onCommentAdded: () => void;
}

const SUBMITTABLE_STATUSES = TICKET_STATUSES.filter((s) => s !== 'closed');

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const CommentInput: React.FC<Props> = ({ticketId, currentStatus, onCommentAdded}) => {
    const [body, setBody] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [status, setStatus] = useState(currentStatus || 'open');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentStatus) {
            setStatus(currentStatus === 'closed' ? 'solved' : currentStatus);
        }
    }, [currentStatus]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const statusChanged = status !== currentStatus && currentStatus !== 'closed';
    const hasComment = body.trim().length > 0;

    const handleSubmit = useCallback(() => {
        if ((!hasComment && !statusChanged) || submitting) {
            return;
        }

        setSubmitting(true);
        setError('');
        addTicketComment(ticketId, body.trim(), isPublic, status)
            .then(() => {
                setBody('');
                onCommentAdded();
            })
            .catch(() => {
                setError('Failed to submit. Please try again.');
            })
            .finally(() => {
                setSubmitting(false);
            });
    }, [body, hasComment, statusChanged, isPublic, status, submitting, ticketId, onCommentAdded]);

    const disabled = (!hasComment && !statusChanged) || submitting;

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
                <div
                    ref={menuRef}
                    style={styles.splitButtonWrapper}
                >
                    <button
                        onClick={handleSubmit}
                        disabled={disabled}
                        style={{
                            ...styles.splitButtonMain,
                            ...(disabled ? styles.splitButtonDisabled : {}),
                        }}
                    >
                        {submitting ? 'Submitting...' : `Submit as ${capitalize(status)}`}
                    </button>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        disabled={submitting}
                        style={{
                            ...styles.splitButtonCaret,
                            ...(submitting ? styles.splitButtonDisabled : {}),
                            ...(menuOpen ? styles.splitButtonCaretActive : {}),
                        }}
                        aria-label='Change status'
                    >
                        <svg
                            width='10'
                            height='6'
                            viewBox='0 0 10 6'
                            fill='none'
                        >
                            <path
                                d='M1 1L5 5L9 1'
                                stroke='currentColor'
                                strokeWidth='1.5'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </button>
                    {menuOpen && (
                        <div style={styles.statusMenu}>
                            <div style={styles.statusMenuLabel}>{'Submit as'}</div>
                            {SUBMITTABLE_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setStatus(s);
                                        setMenuOpen(false);
                                    }}
                                    style={{
                                        ...styles.statusMenuItem,
                                        ...(s === status ? styles.statusMenuItemActive : {}),
                                    }}
                                >
                                    <span
                                        style={{
                                            ...styles.statusDot,
                                            backgroundColor: STATUS_COLORS[s] || '#68737d',
                                        }}
                                    />
                                    <span>{capitalize(s)}</span>
                                    {s === status && (
                                        <svg
                                            width='12'
                                            height='12'
                                            viewBox='0 0 12 12'
                                            fill='none'
                                            style={styles.checkIcon}
                                        >
                                            <path
                                                d='M2.5 6L5 8.5L9.5 3.5'
                                                stroke='currentColor'
                                                strokeWidth='1.5'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                            />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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

    /* Split button group */
    splitButtonWrapper: {
        position: 'relative' as const,
        display: 'inline-flex',
        borderRadius: '4px',
        overflow: 'visible',
    },
    splitButtonMain: {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '4px 0 0 4px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        whiteSpace: 'nowrap' as const,
    },
    splitButtonCaret: {
        padding: '6px 8px',
        border: 'none',
        borderLeft: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '0 4px 4px 0',
        cursor: 'pointer',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitButtonCaretActive: {
        backgroundColor: 'var(--button-bg)',
        filter: 'brightness(0.85)',
    },
    splitButtonDisabled: {
        opacity: 0.5,
        cursor: 'default',
    },

    /* Status dropdown menu */
    statusMenu: {
        position: 'absolute' as const,
        bottom: 'calc(100% + 4px)',
        right: 0,
        minWidth: '160px',
        backgroundColor: 'var(--center-channel-bg)',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.12)',
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '4px 0',
        zIndex: 100,
    },
    statusMenuLabel: {
        padding: '6px 12px 4px',
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    statusMenuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '7px 12px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        textAlign: 'left' as const,
    },
    statusMenuItemActive: {
        backgroundColor: 'rgba(var(--button-bg-rgb, 28, 88, 217), 0.08)',
        fontWeight: 600,
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    checkIcon: {
        marginLeft: 'auto',
        color: 'var(--button-bg)',
    },
};

export default CommentInput;
