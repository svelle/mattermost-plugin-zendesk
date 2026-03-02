import React, {useEffect, useState, useCallback} from 'react';

import type {ConnectionStatus as ConnectionStatusType, Ticket} from '../../api/client';
import {getConnectionStatus, disconnect} from '../../api/client';

import ArticlesTab from './articles_tab';
import ConnectionBanner from './connection_banner';
import TabBar, {type TabType} from './tab_bar';
import TicketDetail from './ticket_detail';
import TicketsTab from './tickets_tab';

const RHSPanel: React.FC = () => {
    const [status, setStatus] = useState<ConnectionStatusType | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('tickets');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    const fetchStatus = useCallback(() => {
        setLoading(true);
        getConnectionStatus().
            then((result) => {
                setStatus(result);
            }).
            catch(() => {
                setStatus({connected: false});
            }).
            finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Listen for WebSocket-triggered connect events to auto-refresh
    useEffect(() => {
        const handler = () => fetchStatus();
        window.addEventListener('zendesk_connected', handler);
        return () => window.removeEventListener('zendesk_connected', handler);
    }, [fetchStatus]);

    const handleDisconnect = useCallback(async () => {
        try {
            await disconnect();
            setStatus({connected: false});
            setSelectedTicket(null);
        } catch {
            // silently handle error
        }
    }, []);

    const handleTicketClick = useCallback((ticket: Ticket) => {
        setSelectedTicket(ticket);
    }, []);

    const handleBackFromDetail = useCallback(() => {
        setSelectedTicket(null);
    }, []);

    const connected = status?.connected ?? false;

    // Show ticket detail view when a ticket is selected
    if (selectedTicket) {
        return (
            <div style={styles.container}>
                <ConnectionBanner
                    status={status}
                    loading={loading}
                    onDisconnect={handleDisconnect}
                />
                <TicketDetail
                    ticketId={selectedTicket.id}
                    subdomain={status?.subdomain}
                    onBack={handleBackFromDetail}
                />
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <ConnectionBanner
                status={status}
                loading={loading}
                onDisconnect={handleDisconnect}
            />
            <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
            {activeTab === 'tickets' && (
                <TicketsTab
                    connected={connected}
                    onTicketClick={handleTicketClick}
                />
            )}
            {activeTab === 'articles' && (
                <ArticlesTab connected={connected}/>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
    },
};

export default RHSPanel;
