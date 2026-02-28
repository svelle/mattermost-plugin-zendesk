import React from 'react';

const ZendeskIcon: React.FC<{size?: number}> = ({size = 16}) => (
    <svg
        width={size}
        height={size}
        viewBox='0 0 24 24'
        fill='currentColor'
        xmlns='http://www.w3.org/2000/svg'
    >
        <path d='M22 4.127v15.746L12.727 24V8.255L22 4.127zM12.727 0L2 19.874h10.727V0zM2 4.127A5.364 5.364 0 007.364 9.49 5.364 5.364 0 0012.727 4.127H2zM22 19.874a5.364 5.364 0 00-5.364-5.364 5.364 5.364 0 00-5.363 5.364H22z'/>
    </svg>
);

export default ZendeskIcon;
