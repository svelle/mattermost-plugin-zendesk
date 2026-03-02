import React from 'react';

export type TabType = 'tickets' | 'articles';

interface Props {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const TabBar: React.FC<Props> = ({activeTab, onTabChange}) => {
    return (
        <div style={styles.container}>
            <button
                style={{
                    ...styles.tab,
                    ...(activeTab === 'tickets' ? styles.activeTab : {}),
                }}
                onClick={() => onTabChange('tickets')}
            >
                {'Tickets'}
            </button>
            <button
                style={{
                    ...styles.tab,
                    ...(activeTab === 'articles' ? styles.activeTab : {}),
                }}
                onClick={() => onTabChange('articles')}
            >
                {'Articles'}
            </button>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        padding: '0 16px',
        gap: '4px',
    },
    tab: {
        background: 'none',
        border: 'none',
        borderBottom: '2px solid transparent',
        padding: '10px 12px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
    },
    activeTab: {
        color: 'var(--button-bg)',
        borderBottomColor: 'var(--button-bg)',
    },
};

export default TabBar;
