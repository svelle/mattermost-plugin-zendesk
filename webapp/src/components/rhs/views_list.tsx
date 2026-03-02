import React, {useState, useEffect, useCallback} from 'react';

import type {ZendeskView} from '../../api/client';
import {getViews} from '../../api/client';

interface Props {
    selectedViewId: number | null;
    onViewChange: (viewId: number | null, viewTitle: string) => void;
}

const ViewsList: React.FC<Props> = ({selectedViewId, onViewChange}) => {
    const [views, setViews] = useState<ZendeskView[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getViews()
            .then((result) => {
                setViews(result.views || []);
            })
            .catch(() => {
                setViews([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            onViewChange(null, '');
            return;
        }
        const viewId = Number(val);
        const view = views.find((v) => v.id === viewId);
        onViewChange(viewId, view?.title || '');
    }, [views, onViewChange]);

    return (
        <div style={styles.container}>
            <select
                value={selectedViewId?.toString() || ''}
                onChange={handleChange}
                disabled={loading}
                style={styles.select}
            >
                <option value={''}>{loading ? 'Loading views...' : 'My Tickets'}</option>
                {views.map((view) => (
                    <option
                        key={view.id}
                        value={view.id.toString()}
                    >
                        {view.title}
                    </option>
                ))}
            </select>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        flex: 1,
        minWidth: 0,
    },
    select: {
        width: '100%',
        padding: '5px 8px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        cursor: 'pointer',
        appearance: 'auto' as const,
    },
};

export default ViewsList;
