import React, {useEffect, useState} from 'react';

import type {ZendeskUser} from '../../api/client';
import {getUser, getOrganization} from '../../api/client';

interface Props {
    userId: number;
    subdomain?: string;
    onBack: () => void;
    onOrgClick: (orgId: number) => void;
}

const UserDetail: React.FC<Props> = ({userId, subdomain, onBack, onOrgClick}) => {
    const [user, setUser] = useState<ZendeskUser | null>(null);
    const [orgName, setOrgName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        setOrgName(null);
        getUser(userId)
            .then((result) => {
                setUser(result.user);
                if (result.user.organization_id > 0) {
                    getOrganization(result.user.organization_id)
                        .then((r) => setOrgName(r.organization.name))
                        .catch(() => { /* ignore */ });
                }
            })
            .catch(() => {
                setError('Failed to load user');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [userId]);

    const zendeskURL = subdomain
        ? `https://${subdomain}.zendesk.com/agent/users/${userId}`
        : '';

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
                <div style={styles.message}>{'Loading user...'}</div>
            )}

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {user && !loading && (
                <div style={styles.detail}>
                    <div style={styles.header}>
                        <div style={styles.avatar}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style={styles.name}>{user.name}</h3>
                            <div style={styles.role}>{user.role}</div>
                        </div>
                    </div>

                    <div style={styles.fields}>
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Email'}</span>
                            <span style={styles.fieldValue}>{user.email}</span>
                        </div>
                        {user.phone && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Phone'}</span>
                                <span style={styles.fieldValue}>{user.phone}</span>
                            </div>
                        )}
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Status'}</span>
                            <span style={{
                                ...styles.statusBadge,
                                backgroundColor: user.active ? '#2e8738' : '#68737d',
                            }}>
                                {user.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {user.verified && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Verified'}</span>
                                <span style={styles.fieldValue}>{'Yes'}</span>
                            </div>
                        )}
                        {user.time_zone && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Timezone'}</span>
                                <span style={styles.fieldValue}>{user.time_zone}</span>
                            </div>
                        )}
                        {user.organization_id > 0 && (
                            <div style={styles.field}>
                                <span style={styles.fieldLabel}>{'Organization'}</span>
                                <button
                                    onClick={() => onOrgClick(user.organization_id)}
                                    style={styles.linkButton}
                                >
                                    {orgName || 'View Organization'}
                                </button>
                            </div>
                        )}
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Created'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(user.created_at).toLocaleString()}
                            </span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Updated'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(user.updated_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {user.tags && user.tags.length > 0 && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Tags'}</div>
                            <div style={styles.tags}>
                                {user.tags.map((tag) => (
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

                    {user.details && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Details'}</div>
                            <div style={styles.textBlock}>{user.details}</div>
                        </div>
                    )}

                    {user.notes && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Notes'}</div>
                            <div style={styles.textBlock}>{user.notes}</div>
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
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 600,
        flexShrink: 0,
    },
    name: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        margin: 0,
        lineHeight: '1.3',
    },
    role: {
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        textTransform: 'capitalize' as const,
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
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '10px',
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
    textBlock: {
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

export default UserDetail;
