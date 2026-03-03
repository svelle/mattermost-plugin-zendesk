import React, {useState, useCallback, useEffect, useRef} from 'react';

import {createTicket} from '../api/client';

export interface CreateTicketEventDetail {
    postId: string;
    postMessage: string;
    channelId: string;
}

interface Props {
    detail: CreateTicketEventDetail;
    onClose: () => void;
}

const CreateTicketModal: React.FC<Props> = ({detail, onClose}) => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState(detail.postMessage);
    const [priority, setPriority] = useState('normal');
    const [ticketType, setTicketType] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const subjectRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        subjectRef.current?.focus();
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

    const handleSubmit = useCallback(async () => {
        if (!subject.trim() || submitting) {
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await createTicket({
                subject: subject.trim(),
                description: description.trim(),
                priority,
                type: ticketType,
                post_id: detail.postId,
                channel_id: detail.channelId,
            });
            onClose();
        } catch {
            setError('Failed to create ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [subject, description, priority, ticketType, detail, submitting, onClose]);

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
                    <h3 style={styles.title}>{'Create Zendesk Ticket'}</h3>
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
                    <div style={styles.field}>
                        <label style={styles.label}>{'Subject'}<span style={styles.required}>{'*'}</span></label>
                        <input
                            ref={subjectRef}
                            type='text'
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder='Brief description of the issue'
                            style={styles.input}
                            disabled={submitting}
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>{'Description'}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder='Detailed description of the issue'
                            style={styles.textarea}
                            rows={5}
                            disabled={submitting}
                        />
                    </div>
                    <div style={styles.row}>
                        <div style={styles.halfField}>
                            <label style={styles.label}>{'Priority'}</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                style={styles.select}
                                disabled={submitting}
                            >
                                <option value='low'>{'Low'}</option>
                                <option value='normal'>{'Normal'}</option>
                                <option value='high'>{'High'}</option>
                                <option value='urgent'>{'Urgent'}</option>
                            </select>
                        </div>
                        <div style={styles.halfField}>
                            <label style={styles.label}>{'Type'}</label>
                            <select
                                value={ticketType}
                                onChange={(e) => setTicketType(e.target.value)}
                                style={styles.select}
                                disabled={submitting}
                            >
                                <option value=''>{'— None —'}</option>
                                <option value='problem'>{'Problem'}</option>
                                <option value='incident'>{'Incident'}</option>
                                <option value='question'>{'Question'}</option>
                                <option value='task'>{'Task'}</option>
                            </select>
                        </div>
                    </div>
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
                        disabled={!subject.trim() || submitting}
                        style={{
                            ...styles.submitBtn,
                            ...(!subject.trim() || submitting ? styles.submitBtnDisabled : {}),
                        }}
                    >
                        {submitting ? 'Creating...' : 'Create Ticket'}
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
        width: '500px',
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
    field: {
        marginBottom: '12px',
    },
    halfField: {
        flex: 1,
    },
    row: {
        display: 'flex',
        gap: '12px',
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
    required: {
        color: '#cc3340',
        marginLeft: '2px',
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
    textarea: {
        width: '100%',
        padding: '8px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '14px',
        lineHeight: '1.4',
        resize: 'vertical' as const,
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const,
    },
    select: {
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

export default CreateTicketModal;
