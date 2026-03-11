import React from 'react';

import type {Article} from '../../api/client';
import ExternalLink from '../external_link';

interface Props {
    articles: Article[];
    loading: boolean;
    error?: string;
}

const ArticleList: React.FC<Props> = ({articles, loading, error}) => {
    if (loading) {
        return <div style={styles.message}>{'Loading articles...'}</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

    if (articles.length === 0) {
        return <div style={styles.message}>{'No articles found. Try searching above.'}</div>;
    }

    return (
        <div style={styles.list}>
            {articles.map((article) => (
                <ExternalLink
                    key={article.id}
                    href={article.html_url}
                    style={styles.row}
                >
                    <div style={styles.title}>{article.title}</div>
                    <div style={styles.meta}>
                        {new Date(article.updated_at).toLocaleDateString()}
                    </div>
                </ExternalLink>
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    list: {
        overflowY: 'auto',
    },
    row: {
        display: 'block',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        textDecoration: 'none',
        transition: 'background 0.1s',
    },
    title: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--button-bg)',
        lineHeight: '1.3',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    meta: {
        fontSize: '11px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        marginTop: '2px',
    },
    message: {
        padding: '16px',
        textAlign: 'center',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '13px',
    },
    error: {
        padding: '16px',
        textAlign: 'center',
        color: '#cc3340',
        fontSize: '13px',
    },
};

export default ArticleList;
