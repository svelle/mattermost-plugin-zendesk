import React, {useEffect, useState} from 'react';

import type {ZendeskOrganization} from '../../api/client';
import {getOrganization} from '../../api/client';

interface Props {
    orgId: number;
    subdomain?: string;
    onBack: () => void;
}

const OrgDetail: React.FC<Props> = ({orgId, subdomain, onBack}) => {
    const [org, setOrg] = useState<ZendeskOrganization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        getOrganization(orgId).
            then((result) => {
                setOrg(result.organization);
            }).
            catch(() => {
                setError('Failed to load organization');
            }).
            finally(() => {
                setLoading(false);
            });
    }, [orgId]);

    const zendeskURL = subdomain ?
        `https://${subdomain}.zendesk.com/agent/organizations/${orgId}` :
        '';

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
                <div style={styles.message}>{'Loading organization...'}</div>
            )}

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {org && !loading && (
                <div style={styles.detail}>
                    <div style={styles.header}>
                        <div style={styles.avatar}>
                            <svg
                                width='20'
                                height='20'
                                viewBox='0 0 24 24'
                                fill='currentColor'
                            >
                                <path d='M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z'/>
                            </svg>
                        </div>
                        <h3 style={styles.name}>{org.name}</h3>
                    </div>

                    <div style={styles.fields}>
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Created'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(org.created_at).toLocaleString()}
                            </span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.fieldLabel}>{'Updated'}</span>
                            <span style={styles.fieldValue}>
                                {new Date(org.updated_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {org.domain_names && org.domain_names.length > 0 && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Domains'}</div>
                            <div style={styles.tags}>
                                {org.domain_names.map((domain) => (
                                    <span
                                        key={domain}
                                        style={styles.tag}
                                    >
                                        {domain}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {org.tags && org.tags.length > 0 && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Tags'}</div>
                            <div style={styles.tags}>
                                {org.tags.map((tag) => (
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

                    {org.details && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Details'}</div>
                            <div style={styles.textBlock}>{org.details}</div>
                        </div>
                    )}

                    {org.notes && (
                        <div style={styles.section}>
                            <div style={styles.sectionLabel}>{'Notes'}</div>
                            <div style={styles.textBlock}>{org.notes}</div>
                        </div>
                    )}

                    {zendeskURL && (
                        <a // eslint-disable-line @mattermost/use-external-link
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
        borderRadius: '8px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    name: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--center-channel-color)',
        margin: 0,
        lineHeight: '1.3',
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

export default OrgDetail;
