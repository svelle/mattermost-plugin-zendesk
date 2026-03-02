import React, {useState, useEffect, useCallback} from 'react';

import type {Ticket, ZendeskView} from '../../api/client';
import {getViews, getViewTickets} from '../../api/client';

import TicketRow from './ticket_row';

interface Props {
    onTicketClick: (ticket: Ticket) => void;
}

const ViewsList: React.FC<Props> = ({onTicketClick}) => {
    const [views, setViews] = useState<ZendeskView[]>([]);
    const [viewsLoaded, setViewsLoaded] = useState(false);
    const [selectedViewId, setSelectedViewId] = useState<string>('');
    const [viewTickets, setViewTickets] = useState<Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    useEffect(() => {
        getViews()
            .then((result) => {
                setViews(result.views || []);
                setViewsLoaded(true);
            })
            .catch(() => {
                setViews([]);
                setViewsLoaded(true);
            });
    }, []);

    const handleViewChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const viewId = e.target.value;
        setSelectedViewId(viewId);
        if (!viewId) {
            setViewTickets([]);
            return;
        }
        setLoadingTickets(true);
        getViewTickets(Number(viewId))
            .then((result) => {
                setViewTickets(result.tickets || []);
            })
            .catch(() => {
                setViewTickets([]);
            })
            .finally(() => {
                setLoadingTickets(false);
            });
    }, []);

    if (!viewsLoaded) {
        return null;
    }

    return (
        <div style={styles.container}>
            <select
                value={selectedViewId}
                onChange={handleViewChange}
                style={styles.select}
            >
                <option value={''}>{'Select a view...'}</option>
                {views.map((view) => (
                    <option
                        key={view.id}
                        value={String(view.id)}
                    >
                        {view.title}
                    </option>
                ))}
            </select>
            {selectedViewId && (
                <div style={styles.ticketList}>
                    {loadingTickets && (
                        <div style={styles.message}>{'Loading...'}</div>
                    )}
                    {!loadingTickets && viewTickets.length === 0 && (
                        <div style={styles.message}>{'No tickets in this view'}</div>
                    )}
                    {!loadingTickets && viewTickets.map((ticket) => (
                        <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            onClick={onTicketClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
    },
    select: {
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
    ticketList: {
        marginTop: '8px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.03)',
        borderRadius: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
    },
    message: {
        padding: '12px 16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '12px',
    },
};

export default ViewsList;
