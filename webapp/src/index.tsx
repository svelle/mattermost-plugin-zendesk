import React from 'react';

import manifest from 'manifest';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import type {PluginRegistry} from 'types/mattermost-webapp';

import GeneratedURLs from './components/admin/generated_urls';
import CreateTicketPostAction from './components/create_ticket_post_action';
import RHSPanel from './components/rhs/rhs_panel';
import ZendeskIcon from './components/zendesk_icon';

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

        // Register post action component (appears in post hover menu)
        registry.registerPostActionComponent(CreateTicketPostAction);

        // Register custom admin console setting for displaying generated URLs
        registry.registerAdminConsoleCustomSetting('GeneratedURLs', GeneratedURLs);
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
