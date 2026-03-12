import React, {useEffect, useState, useCallback} from 'react';

import ArticlesTab from './articles_tab';
import './rhs.scss';
import ConnectionBanner from './connection_banner';
import OrgDetail from './org_detail';
import TabBar, {type TabType} from './tab_bar';
import TicketDetail from './ticket_detail';
import TicketsTab from './tickets_tab';
import UserDetail from './user_detail';

import type {ConnectionStatus as ConnectionStatusType, Ticket} from '../../api/client';
import {getConnectionStatus, disconnect} from '../../api/client';

// Navigation view types
type NavView =
    | {type: 'tabs'}
    | {type: 'ticket'; ticketId: number}
    | {type: 'user'; userId: number}
    | {type: 'org'; orgId: number};

const RHSPanel: React.FC = () => {
    const [status, setStatus] = useState<ConnectionStatusType | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('tickets');

    // Navigation stack for back button support (ticket → user → org → ...)
    const [navStack, setNavStack] = useState<NavView[]>([{type: 'tabs'}]);

    const currentView = navStack[navStack.length - 1];

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
            setNavStack([{type: 'tabs'}]);
        } catch {
            // silently handle error
        }
    }, []);

    const pushView = useCallback((view: NavView) => {
        setNavStack((prev) => [...prev, view]);
    }, []);

    const popView = useCallback(() => {
        setNavStack((prev) => {
            if (prev.length <= 1) {
                return [{type: 'tabs'}];
            }
            return prev.slice(0, -1);
        });
    }, []);

    const handleTicketClick = useCallback((ticket: Ticket) => {
        pushView({type: 'ticket', ticketId: ticket.id});
    }, [pushView]);

    const handleUserClick = useCallback((userId: number) => {
        pushView({type: 'user', userId});
    }, [pushView]);

    const handleOrgClick = useCallback((orgId: number) => {
        pushView({type: 'org', orgId});
    }, [pushView]);

    const connected = status?.connected ?? false;

    const renderContent = () => {
        switch (currentView.type) {
        case 'ticket':
            return (
                <TicketDetail
                    ticketId={currentView.ticketId}
                    subdomain={status?.subdomain}
                    onBack={popView}
                    onUserClick={handleUserClick}
                    onOrgClick={handleOrgClick}
                />
            );
        case 'user':
            return (
                <UserDetail
                    userId={currentView.userId}
                    subdomain={status?.subdomain}
                    onBack={popView}
                    onOrgClick={handleOrgClick}
                />
            );
        case 'org':
            return (
                <OrgDetail
                    orgId={currentView.orgId}
                    subdomain={status?.subdomain}
                    onBack={popView}
                />
            );
        default:
            return (
                <>
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
                </>
            );
        }
    };

    return (
        <div style={styles.container}>
            <ConnectionBanner
                status={status}
                loading={loading}
                onDisconnect={handleDisconnect}
            />
            {renderContent()}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
    },
};

export default RHSPanel;
