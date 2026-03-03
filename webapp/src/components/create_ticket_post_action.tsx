import React, {useCallback} from 'react';

import {createTicketFromPost} from '../api/client';

import ZendeskIcon from './zendesk_icon';

interface Props {
    postId: string;
    channelId?: string;
}

const CreateTicketPostAction: React.FC<Props> = ({postId, channelId}) => {
    const handleClick = useCallback(async () => {
        if (!postId) {
            return;
        }

        try {
            await createTicketFromPost(postId, channelId || '', '');
        } catch {
            // silently handle error - the server will show appropriate messages
        }
    }, [postId, channelId]);

    return (
        <button
            type='button'
            className='post-menu__item'
            onClick={handleClick}
            title='Create Zendesk Ticket'
            style={styles.button}
        >
            <ZendeskIcon size={16}/>
        </button>
    );
};

const styles: Record<string, React.CSSProperties> = {
    button: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
};

export default CreateTicketPostAction;
