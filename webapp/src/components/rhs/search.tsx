import React, {useState, useCallback} from 'react';

import type {Ticket, Article} from '../../api/client';
import {searchTickets, searchArticles} from '../../api/client';

interface Props {
    connected: boolean;
    subdomain?: string;
}

type SearchMode = 'tickets' | 'articles';

const statusColors: Record<string, string> = {
    new: '#1f73b7',
    open: '#e9ab12',
    pending: '#ad5918',
    hold: '#8c232c',
    solved: '#2e8738',
    closed: '#68737d',
};

const Search: React.FC<Props> = ({connected, subdomain}) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            if (mode === 'tickets') {
                const result = await searchTickets(query);
                setTickets(result.tickets || []);
                setArticles([]);
            } else {
                const result = await searchArticles(query);
                setArticles(result.articles || []);
                setTickets([]);
            }
        } catch {
            // silently handle error
        } finally {
            setLoading(false);
        }
    }, [query, mode]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    if (!connected) {
        return null;
    }

    const getTicketUrl = (ticketId: number) => {
        if (subdomain) {
            return `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`;
        }
        return '#';
    };

    return (
        <div style={styles.container}>
            <h4 style={styles.title}>{'Search'}</h4>
            <div style={styles.toggleRow}>
                <button
                    type='button'
                    onClick={() => setMode('tickets')}
                    style={mode === 'tickets' ? styles.toggleActive : styles.toggleInactive}
                >
                    {'Tickets'}
                </button>
                <button
                    type='button'
                    onClick={() => setMode('articles')}
                    style={mode === 'articles' ? styles.toggleActive : styles.toggleInactive}
                >
                    {'Articles'}
                </button>
            </div>
            <div style={styles.searchRow}>
                <input
                    type='text'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === 'tickets' ? 'Search tickets...' : 'Search articles...'}
                    style={styles.searchInput}
                />
                <button
                    type='button'
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    style={styles.searchButton}
                >
                    {loading ? '...' : 'Search'}
                </button>
            </div>

            {searched && !loading && mode === 'tickets' && tickets.length === 0 && (
                <span style={styles.emptyText}>{'No tickets found'}</span>
            )}
            {searched && !loading && mode === 'articles' && articles.length === 0 && (
                <span style={styles.emptyText}>{'No articles found'}</span>
            )}

            <div style={styles.resultsList}>
                {mode === 'tickets' && tickets.map((ticket) => (
                    <a
                        key={ticket.id}
                        href={getTicketUrl(ticket.id)}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={styles.resultRow}
                    >
                        <div style={styles.resultHeader}>
                            <span style={styles.resultId}>{`#${ticket.id}`}</span>
                            <span
                                style={{
                                    ...styles.statusBadge,
                                    backgroundColor: statusColors[ticket.status] || '#87929d',
                                }}
                            >
                                {ticket.status}
                            </span>
                        </div>
                        <span style={styles.resultTitle}>
                            {ticket.subject.length > 80 ? ticket.subject.substring(0, 80) + '...' : ticket.subject}
                        </span>
                    </a>
                ))}
                {mode === 'articles' && articles.map((article) => (
                    <a
                        key={article.id}
                        href={article.html_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={styles.resultRow}
                    >
                        <span style={styles.resultTitle}>{article.title}</span>
                    </a>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '12px 16px',
    },
    title: {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 8px',
        color: 'var(--center-channel-color)',
    },
    toggleRow: {
        display: 'flex',
        gap: '4px',
        marginBottom: '8px',
    },
    toggleActive: {
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        border: 'none',
        borderRadius: '12px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        cursor: 'pointer',
    },
    toggleInactive: {
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '12px',
        backgroundColor: 'transparent',
        color: 'var(--center-channel-color)',
        cursor: 'pointer',
    },
    searchRow: {
        display: 'flex',
        gap: '4px',
        marginBottom: '8px',
    },
    searchInput: {
        flex: 1,
        padding: '6px 10px',
        fontSize: '13px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
    },
    searchButton: {
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: 600,
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        cursor: 'pointer',
    },
    emptyText: {
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    resultsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '250px',
        overflowY: 'auto',
    },
    resultRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px',
        borderRadius: '4px',
        textDecoration: 'none',
        color: 'var(--center-channel-color)',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
        cursor: 'pointer',
    },
    resultHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultId: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        padding: '1px 6px',
        borderRadius: '10px',
        textTransform: 'capitalize' as const,
    },
    resultTitle: {
        fontSize: '13px',
        lineHeight: '1.3',
        color: 'var(--link-color)',
    },
};

export default Search;
