import React, {useState, useEffect, useCallback} from 'react';

import AttachToTicketModal from './attach_to_ticket_modal';
import type {AttachToTicketEventDetail} from './attach_to_ticket_modal';
import CreateTicketModal from './create_ticket_modal';
import type {CreateTicketEventDetail} from './create_ticket_modal';

export const CREATE_TICKET_EVENT = 'zendesk-create-ticket-from-post';
export const ATTACH_TO_TICKET_EVENT = 'zendesk-attach-post-to-ticket';

type ModalState =
    | {type: 'none'}
    | {type: 'create'; detail: CreateTicketEventDetail}
    | {type: 'attach'; detail: AttachToTicketEventDetail};

const ZendeskModalRoot: React.FC = () => {
    const [modal, setModal] = useState<ModalState>({type: 'none'});

    const handleClose = useCallback(() => {
        setModal({type: 'none'});
    }, []);

    useEffect(() => {
        const handleCreate = (e: Event) => {
            const detail = (e as CustomEvent<CreateTicketEventDetail>).detail;
            setModal({type: 'create', detail});
        };

        const handleAttach = (e: Event) => {
            const detail = (e as CustomEvent<AttachToTicketEventDetail>).detail;
            setModal({type: 'attach', detail});
        };

        window.addEventListener(CREATE_TICKET_EVENT, handleCreate);
        window.addEventListener(ATTACH_TO_TICKET_EVENT, handleAttach);

        return () => {
            window.removeEventListener(CREATE_TICKET_EVENT, handleCreate);
            window.removeEventListener(ATTACH_TO_TICKET_EVENT, handleAttach);
        };
    }, []);

    if (modal.type === 'create') {
        return (
            <CreateTicketModal
                detail={modal.detail}
                onClose={handleClose}
            />
        );
    }

    if (modal.type === 'attach') {
        return (
            <AttachToTicketModal
                detail={modal.detail}
                onClose={handleClose}
            />
        );
    }

    return null;
};

export default ZendeskModalRoot;
