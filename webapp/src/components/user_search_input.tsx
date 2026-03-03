import React, {useState, useEffect, useRef, useCallback} from 'react';

import type {ZendeskUser} from '../api/client';
import {searchUsers} from '../api/client';

interface Props {
    selectedUser: ZendeskUser | null;
    onSelect: (user: ZendeskUser | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

const UserSearchInput: React.FC<Props> = ({selectedUser, onSelect, placeholder, disabled}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ZendeskUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!query.trim()) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(() => {
            setSearching(true);
            searchUsers(query.trim())
                .then((r) => {
                    setResults(r.users || []);
                    setShowDropdown(true);
                })
                .catch(() => { /* ignore */ })
                .finally(() => setSearching(false));
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    const handleSelect = useCallback((user: ZendeskUser) => {
        onSelect(user);
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    }, [onSelect]);

    const handleClear = useCallback(() => {
        onSelect(null);
        setQuery('');
        setResults([]);
    }, [onSelect]);

    if (selectedUser) {
        return (
            <div style={styles.selectedWrap}>
                <span style={styles.selectedName}>{selectedUser.name}</span>
                <span style={styles.selectedEmail}>{selectedUser.email}</span>
                {!disabled && (
                    <button
                        onClick={handleClear}
                        style={styles.clearBtn}
                        type='button'
                    >
                        <svg
                            width='12'
                            height='12'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <line
                                x1='18'
                                y1='6'
                                x2='6'
                                y2='18'
                            />
                            <line
                                x1='6'
                                y1='6'
                                x2='18'
                                y2='18'
                            />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={styles.container}
        >
            <div style={styles.inputWrap}>
                <input
                    type='text'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder={placeholder || 'Search users...'}
                    style={styles.input}
                    disabled={disabled}
                />
                {searching && <span style={styles.spinner}>{'...'}</span>}
            </div>
            {showDropdown && results.length > 0 && (
                <div style={styles.dropdown}>
                    {results.slice(0, 8).map((user) => (
                        <div
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            style={styles.dropdownItem}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleSelect(user);
                                }
                            }}
                        >
                            <span style={styles.userName}>{user.name}</span>
                            <span style={styles.userEmail}>{user.email}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'relative',
    },
    inputWrap: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '8px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        fontSize: '14px',
        backgroundColor: 'var(--center-channel-bg)',
        color: 'var(--center-channel-color)',
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    spinner: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        maxHeight: '160px',
        overflowY: 'auto',
        backgroundColor: 'var(--center-channel-bg)',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        zIndex: 100,
    },
    dropdownItem: {
        padding: '6px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.06)',
        display: 'flex',
        flexDirection: 'column',
    },
    userName: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--center-channel-color)',
    },
    userEmail: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
    },
    selectedWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
        borderRadius: '4px',
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
    },
    selectedName: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--center-channel-color)',
    },
    selectedEmail: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.48)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    clearBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        border: 'none',
        borderRadius: '50%',
        background: 'rgba(var(--center-channel-color-rgb), 0.12)',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
    },
};

export default UserSearchInput;
