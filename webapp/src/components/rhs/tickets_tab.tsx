import React, {useEffect, useState, useCallback} from 'react';

import type {Ticket} from '../../api/client';
import {getMyTickets, searchTickets, getViewTickets} from '../../api/client';

import SearchBar from './search_bar';
import StatusFilter from './status_filter';
import TicketList from './ticket_list';
import ViewsList from './views_list';

interface Props {
    connected: boolean;
    onTicketClick: (ticket: Ticket) => void;
}

type TicketSource = 'mine' | 'search' | 'view';

const TicketsTab: React.FC<Props> = ({connected, onTicketClick}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [source, setSource] = useState<TicketSource>('mine');
    const [sourceLabel, setSourceLabel] = useState('My Tickets');
    const [selectedViewId, setSelectedViewId] = useState<number | null>(null);

    const loadMyTickets = useCallback(() => {
        if (!connected) {
            return;
        }
        setLoading(true);
        setError('');
        setSource('mine');
        setSourceLabel('My Tickets');
        setSelectedViewId(null);
        getMyTickets()
            .then((result) => {
                setTickets(result.tickets || []);
            })
            .catch(() => {
                setError('Failed to load tickets');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [connected]);

    useEffect(() => {
        loadMyTickets();
    }, [loadMyTickets]);

    const handleSearch = useCallback((query: string) => {
        setLoading(true);
        setError('');
        setSource('search');
        setSourceLabel('Search Results');
        setSelectedViewId(null);
        searchTickets(query)
            .then((result) => {
                setTickets(result.tickets || []);
            })
            .catch(() => {
                setError('Search failed');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleSearchClear = useCallback(() => {
        loadMyTickets();
    }, [loadMyTickets]);

    const handleViewChange = useCallback((viewId: number | null, viewTitle: string) => {
        if (!viewId) {
            loadMyTickets();
            return;
        }
        setLoading(true);
        setError('');
        setSource('view');
        setSourceLabel(viewTitle);
        setSelectedViewId(viewId);
        getViewTickets(viewId)
            .then((result) => {
                setTickets(result.tickets || []);
            })
            .catch(() => {
                setError('Failed to load view tickets');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [loadMyTickets]);

    if (!connected) {
        return (
            <div style={styles.message}>
                {'Connect to Zendesk to view tickets.'}
            </div>
        );
    }

    const filteredCount = statusFilter
        ? tickets.filter((t) => t.status === statusFilter).length
        : tickets.length;

    return (
        <div style={styles.container}>
            <SearchBar
                placeholder='Search tickets...'
                onSearch={handleSearch}
                onClear={handleSearchClear}
            />
            <div style={styles.filters}>
                <ViewsList
                    selectedViewId={selectedViewId}
                    onViewChange={handleViewChange}
                />
                <StatusFilter
                    selected={statusFilter}
                    onChange={setStatusFilter}
                />
            </div>
            <div style={styles.sectionHeader}>
                <span>
                    {sourceLabel}
                    {!loading && ` (${filteredCount})`}
                </span>
                {source !== 'mine' && (
                    <button
                        onClick={loadMyTickets}
                        style={styles.clearButton}
                    >
                        {'Clear'}
                    </button>
                )}
            </div>
            <TicketList
                tickets={tickets}
                loading={loading}
                error={error}
                statusFilter={statusFilter}
                emptyMessage={source === 'search' ? 'No tickets match your search' : 'No tickets found'}
                onTicketClick={onTicketClick}
            />
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto',
    },
    filters: {
        display: 'flex',
        gap: '6px',
        padding: '0 16px 8px',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.64)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
    },
    clearButton: {
        background: 'none',
        border: 'none',
        fontSize: '11px',
        color: 'var(--button-bg)',
        cursor: 'pointer',
        fontWeight: 500,
    },
    message: {
        padding: '24px 16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
};

export default TicketsTab;
