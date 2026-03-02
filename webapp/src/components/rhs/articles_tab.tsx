import React, {useState, useCallback} from 'react';

import type {Article} from '../../api/client';
import {searchArticles} from '../../api/client';

import ArticleList from './article_list';
import SearchBar from './search_bar';

interface Props {
    connected: boolean;
}

const ArticlesTab: React.FC<Props> = ({connected}) => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = useCallback((query: string) => {
        setLoading(true);
        setError('');
        setHasSearched(true);
        searchArticles(query)
            .then((result) => {
                setArticles(result.articles || []);
            })
            .catch(() => {
                setError('Search failed');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (!connected) {
        return (
            <div style={styles.message}>
                {'Connect to Zendesk to search articles.'}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <SearchBar
                placeholder='Search articles...'
                onSearch={handleSearch}
            />
            {!hasSearched && !loading && (
                <div style={styles.message}>
                    {'Search for Help Center articles above.'}
                </div>
            )}
            {hasSearched && (
                <ArticleList
                    articles={articles}
                    loading={loading}
                    error={error}
                />
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto',
    },
    message: {
        padding: '24px 16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
};

export default ArticlesTab;
