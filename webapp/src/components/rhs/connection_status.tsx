import React from 'react';

import manifest from 'manifest';

import type {ConnectionStatus as ConnectionStatusType} from '../../api/client';

interface Props {
    status: ConnectionStatusType | null;
    loading: boolean;
    onDisconnect: () => void;
}

const ConnectionStatus: React.FC<Props> = ({status, loading, onDisconnect}) => {
    if (loading) {
        return (
            <div style={styles.container}>
                <span style={styles.loadingText}>{'Checking connection...'}</span>
            </div>
        );
    }

    if (!status || !status.connected) {
        const connectUrl = `/plugins/${manifest.id}/api/v1/oauth/connect`;
        return (
            <div style={styles.container}>
                <div style={styles.disconnected}>
                    <span>{'Not connected to Zendesk'}</span>
                    <a
                        href={connectUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={styles.connectButton}
                    >
                        {'Connect to Zendesk'}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.connected}>
                <div style={styles.userInfo}>
                    <span style={styles.connectedBadge}>{'Connected'}</span>
                    {status.user && (
                        <span style={styles.userName}>
                            {status.user.name}
                            {' '}
                            <span style={styles.userEmail}>{`(${status.user.email})`}</span>
                        </span>
                    )}
                </div>
                <button
                    type='button'
                    onClick={onDisconnect}
                    style={styles.disconnectButton}
                >
                    {'Disconnect'}
                </button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '12px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    loadingText: {
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    disconnected: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    connectButton: {
        display: 'inline-block',
        padding: '6px 16px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        borderRadius: '4px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 600,
    },
    connected: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    connectedBadge: {
        color: '#2e8738',
        fontSize: '12px',
        fontWeight: 600,
    },
    userName: {
        fontSize: '13px',
        color: 'var(--center-channel-color)',
    },
    userEmail: {
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    disconnectButton: {
        padding: '4px 12px',
        backgroundColor: 'transparent',
        color: 'var(--error-text)',
        border: '1px solid var(--error-text)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
    },
};

export default ConnectionStatus;
