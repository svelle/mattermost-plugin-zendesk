import React, {useState} from 'react';

interface Props {
    placeholder?: string;
    onSearch: (query: string) => void;
    onClear?: () => void;
    disabled?: boolean;
}

const SearchBar: React.FC<Props> = ({placeholder = 'Search...', onSearch, onClear, disabled}) => {
    const [query, setQuery] = useState('');

    const handleSubmit = () => {
        const trimmed = query.trim();
        if (trimmed) {
            onSearch(trimmed);
        }
    };

    const handleClear = () => {
        setQuery('');
        onClear?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.inputWrapper}>
                <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    style={styles.searchIcon}
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
                <input
                    type='text'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    style={styles.input}
                />
                {query && (
                    <button
                        onClick={handleClear}
                        style={styles.clearButton}
                        aria-label='Clear search'
                    >
                        <svg
                            width='14'
                            height='14'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                        >
                            <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/>
                        </svg>
                    </button>
                )}
            </div>
            <button
                onClick={handleSubmit}
                disabled={disabled || !query.trim()}
                style={styles.button}
            >
                {'Search'}
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
    inputWrapper: {
        flex: 1,
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute' as const,
        left: '8px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        pointerEvents: 'none' as const,
    },
    input: {
        width: '100%',
        padding: '6px 28px 6px 28px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '13px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
    },
    clearButton: {
        position: 'absolute' as const,
        right: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        border: 'none',
        background: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        borderRadius: '2px',
        padding: 0,
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'var(--button-bg)',
        color: 'var(--button-color)',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap' as const,
    },
};

export default SearchBar;
