import React, {useEffect, useState} from 'react';

import TicketRow from './ticket_row';

import type {Ticket} from '../../api/client';
import {getUser} from '../../api/client';

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
    const [requesterNames, setRequesterNames] = useState<Record<number, string>>({});

    // Batch-fetch requester names for all tickets
    useEffect(() => {
        if (tickets.length === 0) {
            return;
        }

        const uniqueIds = [...new Set(
            tickets.
                map((t) => t.requester_id).
                filter((id) => id > 0 && !requesterNames[id]),
        )];

        if (uniqueIds.length === 0) {
            return;
        }

        Promise.allSettled(
            uniqueIds.map((id) =>
                getUser(id).then((r) => ({id, name: r.user.name})),
            ),
        ).then((results) => {
            const newNames: Record<number, string> = {};
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    newNames[result.value.id] = result.value.name;
                }
            }
            if (Object.keys(newNames).length > 0) {
                setRequesterNames((prev) => ({...prev, ...newNames}));
            }
        });
    }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <div style={styles.message}>{'Loading tickets...'}</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

    const filtered = statusFilter ?
        tickets.filter((t) => t.status === statusFilter) :
        tickets;

    if (filtered.length === 0) {
        return <div style={styles.message}>{emptyMessage}</div>;
    }

    return (
        <div style={styles.list}>
            {filtered.map((ticket) => (
                <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    requesterName={requesterNames[ticket.requester_id]}
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
