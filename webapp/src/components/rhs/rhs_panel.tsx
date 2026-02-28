import React, {useEffect, useState, useCallback} from 'react';

import type {ConnectionStatus as ConnectionStatusType} from '../../api/client';
import {getConnectionStatus, disconnect} from '../../api/client';

import ConnectionStatus from './connection_status';
import MyTickets from './my_tickets';
import Search from './search';

const RHSPanel: React.FC = () => {
    const [status, setStatus] = useState<ConnectionStatusType | null>(null);
    const [loading, setLoading] = useState(true);

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

    const handleDisconnect = useCallback(async () => {
        try {
            await disconnect();
            setStatus({connected: false});
        } catch {
            // silently handle error
        }
    }, []);

    // TODO: read subdomain from plugin settings if exposed to webapp
    const subdomain = undefined;

    return (
        <div style={styles.container}>
            <ConnectionStatus
                status={status}
                loading={loading}
                onDisconnect={handleDisconnect}
            />
            <MyTickets
                connected={status?.connected ?? false}
                subdomain={subdomain}
            />
            <Search
                connected={status?.connected ?? false}
                subdomain={subdomain}
            />
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
