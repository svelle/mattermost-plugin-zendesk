import React from 'react';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
};

const ExternalLink: React.FC<Props> = ({children, ...props}) => (
    // eslint-disable-next-line @mattermost/use-external-link
    <a
        {...props}
        target='_blank'
        rel='noopener noreferrer'
    >
        {children}
    </a>
);

export default ExternalLink;
