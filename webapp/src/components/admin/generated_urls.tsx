import manifest from 'manifest';
import React, {useCallback, useState} from 'react';

const PLUGIN_ID = manifest.id;

const GeneratedURLs: React.FC = () => {
    const siteURL = getSiteURL();
    const redirectURL = `${siteURL}/plugins/${PLUGIN_ID}/api/v1/oauth/callback`;
    const webhookURL = `${siteURL}/plugins/${PLUGIN_ID}/api/v1/webhook`;

    return (
        <div style={styles.container}>
            <URLField
                label='OAuth Redirect URL'
                helpText='Copy this URL into the Redirect URLs field when creating the Zendesk OAuth client.'
                url={redirectURL}
            />
            <div style={{marginTop: '16px'}}/>
            <URLField
                label='Webhook URL'
                helpText='Copy this URL into the Endpoint URL field when creating a Zendesk webhook for notifications.'
                url={webhookURL}
            />
        </div>
    );
};

interface URLFieldProps {
    label: string;
    helpText: string;
    url: string;
}

const URLField: React.FC<URLFieldProps> = ({label, helpText, url}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [url]);

    return (
        <div>
            <label style={styles.label}>{label}</label>
            <div style={styles.urlRow}>
                <input
                    type='text'
                    readOnly={true}
                    value={url}
                    style={styles.urlInput}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                    type='button'
                    onClick={handleCopy}
                    style={styles.copyButton}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div style={styles.helpText}>{helpText}</div>
        </div>
    );
};

function getSiteURL(): string {
    // In the admin console, window.location gives us the Mattermost URL
    return window.location.origin;
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '0',
    },
    label: {
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '4px',
        display: 'block',
    },
    urlRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    urlInput: {
        flex: 1,
        padding: '8px 12px',
        fontSize: '13px',
        fontFamily: 'monospace',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#f5f5f5',
        color: '#333',
    },
    copyButton: {
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    helpText: {
        fontSize: '12px',
        color: '#999',
        marginTop: '4px',
    },
};

export default GeneratedURLs;
