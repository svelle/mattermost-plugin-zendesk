import React from 'react';

import manifest from 'manifest';

import type {ConnectionStatus} from '../../api/client';

interface Props {
    status: ConnectionStatus | null;
    loading: boolean;
    onDisconnect: () => void;
}

const ConnectionBanner: React.FC<Props> = ({status, loading, onDisconnect}) => {
    if (loading) {
        return (
            <div style={styles.banner}>
                <span style={styles.text}>{'Checking connection...'}</span>
            </div>
        );
    }

    if (!status?.connected) {
        const connectURL = `/plugins/${manifest.id}/api/v1/oauth/connect`;
        return (
            <div style={{...styles.banner, ...styles.disconnected}}>
                <span style={styles.text}>{'Not connected'}</span>
                <a
                    href={connectURL}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={styles.connectLink}
                >
                    {'Connect'}
                </a>
            </div>
        );
    }

    return (
        <div style={{...styles.banner, ...styles.connected}}>
            <span style={styles.text}>
                {status.user?.name || 'Connected'}
            </span>
            <button
                onClick={onDisconnect}
                style={styles.disconnectButton}
            >
                {'Disconnect'}
            </button>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    banner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        fontSize: '12px',
    },
    connected: {
        background: 'rgba(61, 184, 135, 0.08)',
    },
    disconnected: {
        background: 'rgba(var(--center-channel-color-rgb), 0.04)',
    },
    text: {
        color: 'var(--center-channel-color)',
        fontWeight: 500,
    },
    connectLink: {
        color: 'var(--button-bg)',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '12px',
    },
    disconnectButton: {
        background: 'none',
        border: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        padding: '2px 0',
        fontSize: '12px',
    },
};

export default ConnectionBanner;
