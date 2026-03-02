import React from 'react';

import {TICKET_STATUSES, STATUS_COLORS} from '../../constants';

interface Props {
    selected: string | null;
    onChange: (status: string | null) => void;
}

const StatusFilter: React.FC<Props> = ({selected, onChange}) => {
    return (
        <div style={styles.container}>
            <button
                style={{
                    ...styles.chip,
                    ...(selected === null ? styles.chipActive : {}),
                }}
                onClick={() => onChange(null)}
            >
                {'All'}
            </button>
            {TICKET_STATUSES.map((status) => (
                <button
                    key={status}
                    style={{
                        ...styles.chip,
                        ...(selected === status ? {
                            ...styles.chipActive,
                            backgroundColor: STATUS_COLORS[status],
                            borderColor: STATUS_COLORS[status],
                            color: '#fff',
                        } : {}),
                    }}
                    onClick={() => onChange(selected === status ? null : status)}
                >
                    {status}
                </button>
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '0 16px 8px',
    },
    chip: {
        padding: '2px 8px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: 'transparent',
        color: 'rgba(var(--center-channel-color-rgb), 0.64)',
        cursor: 'pointer',
        textTransform: 'capitalize' as const,
        transition: 'all 0.15s',
    },
    chipActive: {
        backgroundColor: 'var(--button-bg)',
        borderColor: 'var(--button-bg)',
        color: 'var(--button-color)',
    },
};

export default StatusFilter;
