import React from 'react';

import {TICKET_STATUSES, STATUS_COLORS} from '../../constants';

interface Props {
    selected: string | null;
    onChange: (status: string | null) => void;
}

const StatusFilter: React.FC<Props> = ({selected, onChange}) => {
    return (
        <div style={styles.container}>
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
            {selected && (
                <span
                    style={{
                        ...styles.indicator,
                        backgroundColor: STATUS_COLORS[selected] || '#68737d',
                    }}
                />
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
    },
    select: {
        flex: 1,
        appearance: 'none' as const,
        WebkitAppearance: 'none' as const,
        padding: '6px 28px 6px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        backgroundColor: 'var(--center-channel-bg)',
        cursor: 'pointer',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%2368737d\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
    },
    indicator: {
        position: 'absolute' as const,
        right: '24px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        pointerEvents: 'none' as const,
    },
};

export default StatusFilter;
