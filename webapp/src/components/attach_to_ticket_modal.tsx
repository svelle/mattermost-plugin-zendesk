import React, {useState, useCallback, useEffect, useRef} from 'react';

import type {Ticket} from '../api/client';
import {searchTickets, attachPostToTicket} from '../api/client';
import {STATUS_COLORS} from '../constants';

export interface AttachToTicketEventDetail {
    postId: string;
    postMessage: string;
    channelId: string;
}

interface Props {
    detail: AttachToTicketEventDetail;
    onClose: () => void;
}

const AttachToTicketModal: React.FC<Props> = ({detail, onClose}) => {
    const [query, setQuery] = useState('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isPublic, setIsPublic] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!query.trim()) {
            setTickets([]);
            setHasSearched(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            setSearching(true);
            setError('');
            searchTickets(query.trim())
                .then((result) => {
                    setTickets(result.tickets || []);
                    setHasSearched(true);
                })
                .catch(() => {
                    setError('Failed to search tickets');
                })
                .finally(() => {
                    setSearching(false);
                });
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    const handleSubmit = useCallback(async () => {
        if (!selectedTicket || submitting) {
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await attachPostToTicket(
                selectedTicket.id,
                detail.postId,
                detail.channelId,
                isPublic,
            );
            onClose();
        } catch {
            setError('Failed to attach post to ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [selectedTicket, isPublic, detail, submitting, onClose]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    return (
        <div
            style={styles.backdrop}
            onClick={handleBackdropClick}
        >
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h3 style={styles.title}>{'Attach Post to Zendesk Ticket'}</h3>
                    <button
                        onClick={onClose}
                        style={styles.closeBtn}
                    >
                        <svg
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <line
                                x1='18'
                                y1='6'
                                x2='6'
                                y2='18'
                            />
                            <line
                                x1='6'
                                y1='6'
                                x2='18'
                                y2='18'
                            />
                        </svg>
                    </button>
                </div>
                <div style={styles.body}>
                    {/* Post preview */}
                    <div style={styles.previewCard}>
                        <div style={styles.previewLabel}>{'Post content'}</div>
                        <div style={styles.previewText}>
                            {detail.postMessage.length > 150
                                ? detail.postMessage.substring(0, 150) + '...'
                                : detail.postMessage}
                        </div>
                    </div>

                    {/* Search */}
                    <div style={styles.field}>
                        <label style={styles.label}>{'Search for a ticket'}</label>
                        <div style={styles.searchWrap}>
                            <input
                                ref={searchRef}
                                type='text'
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedTicket(null);
                                }}
                                placeholder='Search by ticket number, subject, or keyword...'
                                style={styles.input}
                                disabled={submitting}
                            />
                            {searching && (
                                <span style={styles.searchSpinner}>{'...'}</span>
                            )}
                        </div>
                    </div>

                    {/* Search results */}
                    {hasSearched && tickets.length === 0 && !searching && (
                        <div style={styles.noResults}>{'No tickets found'}</div>
                    )}

                    {tickets.length > 0 && (
                        <div style={styles.resultsList}>
                            {tickets.slice(0, 10).map((ticket) => {
                                const isSelected = selectedTicket?.id === ticket.id;
                                const statusColor = STATUS_COLORS[ticket.status] || '#68737d';
                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        style={{
                                            ...styles.resultItem,
                                            ...(isSelected ? styles.resultItemSelected : {}),
                                        }}
                                        role='button'
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedTicket(ticket);
                                            }
                                        }}
                                    >
                                        <div style={styles.resultTop}>
                                            <span style={styles.resultId}>{'#'}{ticket.id}</span>
                                            <span style={{
                                                ...styles.resultStatus,
                                                backgroundColor: statusColor,
                                            }}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <div style={styles.resultSubject}>{ticket.subject}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Visibility toggle */}
                    {selectedTicket && (
                        <div style={styles.visibilityRow}>
                            <label style={styles.label}>{'Comment visibility'}</label>
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
                        </div>
                    )}

                    {error && (
                        <div style={styles.error}>{error}</div>
                    )}
                </div>
                <div style={styles.footer}>
                    <button
                        onClick={onClose}
                        style={styles.cancelBtn}
                        disabled={submitting}
                    >
                        {'Cancel'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedTicket || submitting}
                        style={{
                            ...styles.submitBtn,
                            ...(!selectedTicket || submitting ? styles.submitBtnDisabled : {}),
                        }}
                    >
                        {submitting ? 'Attaching...' : 'Attach to Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    modal: {
        backgroundColor: 'var(--center-channel-bg)',
        borderRadius: '8px',
        width: '520px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    title: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
    },
    closeBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        borderRadius: '4px',
        background: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        padding: 0,
    },
    body: {
        padding: '16px 20px',
        overflowY: 'auto',
        flex: 1,
    },
    previewCard: {
        padding: '10px 12px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
        borderRadius: '4px',
        marginBottom: '12px',
    },
    previewLabel: {
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
        marginBottom: '4px',
    },
    previewText: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    field: {
        marginBottom: '8px',
    },
    label: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.64)',
        marginBottom: '4px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
    },
    searchWrap: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '8px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '14px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    searchSpinner: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
    },
    noResults: {
        padding: '12px 0',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
    },
    resultsList: {
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '4px',
        marginBottom: '12px',
    },
    resultItem: {
        padding: '8px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.06)',
    },
    resultItemSelected: {
        backgroundColor: 'rgba(var(--button-bg-rgb, 28, 88, 217), 0.08)',
        borderLeft: '3px solid var(--button-bg)',
    },
    resultTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2px',
    },
    resultId: {
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontWeight: 500,
    },
    resultStatus: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#fff',
        padding: '1px 6px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
    },
    resultSubject: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    visibilityRow: {
        marginTop: '12px',
    },
    toggleRow: {
        display: 'flex',
        gap: '2px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.06)',
        borderRadius: '4px',
        padding: '2px',
    },
    toggleBtn: {
        flex: 1,
        padding: '5px 8px',
        border: 'none',
        borderRadius: '3px',
        fontSize: '12px',
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
    error: {
        marginTop: '8px',
        fontSize: '13px',
        color: '#cc3340',
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        padding: '12px 20px',
        borderTop: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    cancelBtn: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        color: 'var(--center-channel-color)',
    },
    submitBtn: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '13px',
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

export default AttachToTicketModal;
