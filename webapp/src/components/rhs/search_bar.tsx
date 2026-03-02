import React, {useState} from 'react';

interface Props {
    placeholder?: string;
    onSearch: (query: string) => void;
    disabled?: boolean;
}

const SearchBar: React.FC<Props> = ({placeholder = 'Search...', onSearch, disabled}) => {
    const [query, setQuery] = useState('');

    const handleSubmit = () => {
        const trimmed = query.trim();
        if (trimmed) {
            onSearch(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div style={styles.container}>
            <input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                style={styles.input}
            />
            <button
                onClick={handleSubmit}
                disabled={disabled || !query.trim()}
                style={styles.button}
            >
                <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                >
                    <circle
                        cx='11'
                        cy='11'
                        r='8'
                    />
                    <line
                        x1='21'
                        y1='21'
                        x2='16.65'
                        y2='16.65'
                    />
                </svg>
            </button>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        gap: '4px',
        padding: '12px 16px 8px',
    },
    input: {
        flex: 1,
        padding: '6px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '13px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        cursor: 'pointer',
        fontSize: '13px',
    },
};

export default SearchBar;
