import React, {useState, useCallback} from 'react';

import type {Ticket, ZendeskView} from '../../api/client';
import {getViews, getViewTickets} from '../../api/client';

import TicketRow from './ticket_row';

interface Props {
    onTicketClick: (ticket: Ticket) => void;
}

const ViewsList: React.FC<Props> = ({onTicketClick}) => {
    const [expanded, setExpanded] = useState(false);
    const [views, setViews] = useState<ZendeskView[]>([]);
    const [loadingViews, setLoadingViews] = useState(false);
    const [viewsLoaded, setViewsLoaded] = useState(false);

    const [selectedView, setSelectedView] = useState<ZendeskView | null>(null);
    const [viewTickets, setViewTickets] = useState<Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    const handleToggle = useCallback(() => {
        if (!expanded && !viewsLoaded) {
            setLoadingViews(true);
            getViews()
                .then((result) => {
                    setViews(result.views || []);
                    setViewsLoaded(true);
                })
                .catch(() => {
                    setViews([]);
                })
                .finally(() => {
                    setLoadingViews(false);
                });
        }
        setExpanded(!expanded);
    }, [expanded, viewsLoaded]);

    const handleViewClick = useCallback((view: ZendeskView) => {
        if (selectedView?.id === view.id) {
            setSelectedView(null);
            setViewTickets([]);
            return;
        }
        setSelectedView(view);
        setLoadingTickets(true);
        getViewTickets(view.id)
            .then((result) => {
                setViewTickets(result.tickets || []);
            })
            .catch(() => {
                setViewTickets([]);
            })
            .finally(() => {
                setLoadingTickets(false);
            });
    }, [selectedView]);

    return (
        <div style={styles.container}>
            <button
                onClick={handleToggle}
                style={styles.header}
            >
                <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                    style={{
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                    }}
                >
                    <path d='M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z'/>
                </svg>
                <span>{'Views'}</span>
            </button>
            {expanded && (
                <div style={styles.content}>
                    {loadingViews && (
                        <div style={styles.message}>{'Loading views...'}</div>
                    )}
                    {!loadingViews && views.length === 0 && viewsLoaded && (
                        <div style={styles.message}>{'No views available'}</div>
                    )}
                    {views.map((view) => (
                        <div key={view.id}>
                            <button
                                onClick={() => handleViewClick(view)}
                                style={{
                                    ...styles.viewItem,
                                    ...(selectedView?.id === view.id ? styles.viewItemActive : {}),
                                }}
                            >
                                {view.title}
                            </button>
                            {selectedView?.id === view.id && (
                                <div style={styles.viewTickets}>
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
                    ))}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        borderTop: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        padding: '10px 16px',
        border: 'none',
        background: 'none',
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.64)',
        cursor: 'pointer',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    content: {
        maxHeight: '300px',
        overflowY: 'auto',
    },
    viewItem: {
        display: 'block',
        width: '100%',
        padding: '8px 16px 8px 32px',
        border: 'none',
        background: 'none',
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'background 0.1s',
    },
    viewItemActive: {
        backgroundColor: 'rgba(var(--button-bg-rgb), 0.08)',
        fontWeight: 600,
    },
    viewTickets: {
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.03)',
    },
    message: {
        padding: '12px 16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '12px',
    },
};

export default ViewsList;
