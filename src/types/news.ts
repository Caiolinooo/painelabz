export interface NewsCategory {
    id: string;
    name: string;
    color: string;
    description?: string;
    icon?: string;
}

export interface NewsPost {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    media_urls: string[];
    external_links: Array<{ url: string, title: string }>;
    author: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
    };
    category: NewsCategory | null;
    tags: string[];
    published_at: string;
    likes_count: number;
    comments_count: number;
    views_count: number;
    featured: boolean;
    pinned: boolean;
    user_liked?: boolean;
    metadata?: any;
    latest_likes?: Array<{
        userId: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    }>;
}
