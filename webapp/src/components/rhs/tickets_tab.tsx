import React, {useEffect, useState, useCallback} from 'react';

import type {Ticket} from '../../api/client';
import {getMyTickets, searchTickets} from '../../api/client';

import SearchBar from './search_bar';
import StatusFilter from './status_filter';
import TicketList from './ticket_list';
import ViewsList from './views_list';

interface Props {
    connected: boolean;
    onTicketClick: (ticket: Ticket) => void;
}

const TicketsTab: React.FC<Props> = ({connected, onTicketClick}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [isSearchResult, setIsSearchResult] = useState(false);

    const loadMyTickets = useCallback(() => {
        if (!connected) {
            return;
        }
        setLoading(true);
        setError('');
        setIsSearchResult(false);
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
        setIsSearchResult(true);
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

    if (!connected) {
        return (
            <div style={styles.message}>
                {'Connect to Zendesk to view tickets.'}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <SearchBar
                placeholder='Search tickets...'
                onSearch={handleSearch}
            />
            <StatusFilter
                selected={statusFilter}
                onChange={setStatusFilter}
            />
            <div style={styles.sectionHeader}>
                <span>{isSearchResult ? 'Search Results' : 'My Tickets'}</span>
                {isSearchResult && (
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
                emptyMessage={isSearchResult ? 'No tickets match your search' : 'No tickets assigned to you'}
                onTicketClick={onTicketClick}
            />
            <ViewsList onTicketClick={onTicketClick}/>
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
