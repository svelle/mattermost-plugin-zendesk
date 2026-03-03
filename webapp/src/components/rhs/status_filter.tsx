import React from 'react';

import {TICKET_STATUSES, STATUS_COLORS} from '../../constants';

interface Props {
    selected: string | null;
    onChange: (status: string | null) => void;
}

const StatusFilter: React.FC<Props> = ({selected, onChange}) => {
    return (
        <div style={styles.container}>
            {selected && (
                <span
                    style={{
                        ...styles.dot,
                        backgroundColor: STATUS_COLORS[selected] || '#68737d',
                    }}
                />
            )}
            <select
                value={selected || ''}
                onChange={(e) => onChange(e.target.value || null)}
                style={styles.select}
            >
                <option value={''}>{'All statuses'}</option>
                {TICKET_STATUSES.map((status) => (
                    <option
                        key={status}
                        value={status}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    dot: {
        position: 'absolute' as const,
        left: '8px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        pointerEvents: 'none' as const,
    },
    select: {
        width: '100%',
        padding: '5px 8px',
        paddingLeft: '22px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        cursor: 'pointer',
        appearance: 'auto' as const,
    },
};

export default StatusFilter;
