import React from 'react';

import manifest from 'manifest';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import type {PluginRegistry} from 'types/mattermost-webapp';

import GeneratedURLs from './components/admin/generated_urls';
import RHSPanel from './components/rhs/rhs_panel';
import ZendeskIcon from './components/zendesk_icon';
import ZendeskModalRoot, {CREATE_TICKET_EVENT, ATTACH_TO_TICKET_EVENT} from './components/zendesk_modal_root';

export default class Plugin {
    public async initialize(registry: PluginRegistry, store: Store<GlobalState>) {
        // Register the Right-Hand Sidebar panel
        const {toggleRHSPlugin} = registry.registerRightHandSidebarComponent(RHSPanel, 'Zendesk');

        // Register channel header button to toggle the RHS
        registry.registerChannelHeaderButtonAction(
            () => React.createElement(ZendeskIcon, {size: 18}),
            () => store.dispatch(toggleRHSPlugin as any),
            'Zendesk',
            'Toggle Zendesk panel',
        );

        // Register root component for rendering modals
        registry.registerRootComponent(ZendeskModalRoot);

        // Register post dropdown menu actions
        registry.registerPostDropdownMenuAction(
            'Create Zendesk Ticket',

            // At runtime, Mattermost passes (postId: string) to the action
            ((postId: string) => {
                const state = store.getState();
                const post = state.entities?.posts?.posts?.[postId];
                const postMessage = post?.message || '';
                const channelId = post?.channel_id || '';
                window.dispatchEvent(
                    new CustomEvent(CREATE_TICKET_EVENT, {
                        detail: {postId, postMessage, channelId},
                    }),
                );
            }) as unknown as () => void,
            () => true,
        );

        registry.registerPostDropdownMenuAction(
            'Attach to Zendesk Ticket',

            // At runtime, Mattermost passes (postId: string) to the action
            ((postId: string) => {
                const state = store.getState();
                const post = state.entities?.posts?.posts?.[postId];
                const postMessage = post?.message || '';
                const channelId = post?.channel_id || '';
                window.dispatchEvent(
                    new CustomEvent(ATTACH_TO_TICKET_EVENT, {
                        detail: {postId, postMessage, channelId},
                    }),
                );
            }) as unknown as () => void,
            () => true,
        );

        // Register custom admin console setting for displaying generated URLs
        registry.registerAdminConsoleCustomSetting('GeneratedURLs', GeneratedURLs);

        // Listen for WebSocket events from the server (e.g., OAuth connect)
        registry.registerWebSocketEventHandler(
            `custom_${manifest.id}_connect`,
            () => {
                // Dispatch a DOM event so the RHS can re-fetch connection status
                window.dispatchEvent(new CustomEvent('zendesk_connected'));
            },
        );
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
