import React from 'react';

import type {Ticket} from '../../api/client';

import TicketRow from './ticket_row';

interface Props {
    tickets: Ticket[];
    loading: boolean;
    error?: string;
    statusFilter: string | null;
    emptyMessage?: string;
    onTicketClick: (ticket: Ticket) => void;
}

const TicketList: React.FC<Props> = ({
    tickets,
    loading,
    error,
    statusFilter,
    emptyMessage = 'No tickets found',
    onTicketClick,
}) => {
    if (loading) {
        return <div style={styles.message}>{'Loading tickets...'}</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

    const filtered = statusFilter
        ? tickets.filter((t) => t.status === statusFilter)
        : tickets;

    if (filtered.length === 0) {
        return <div style={styles.message}>{emptyMessage}</div>;
    }

    return (
        <div style={styles.list}>
            {filtered.map((ticket) => (
                <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onClick={onTicketClick}
                />
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    list: {
        overflowY: 'auto',
    },
    message: {
        padding: '16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    error: {
        padding: '16px',
        textAlign: 'center',
        color: '#cc3340',
        fontSize: '13px',
    },
};

export default TicketList;
