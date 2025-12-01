// lib/formatters.ts - Utility functions for formatting numbers and views

/**
 * Format view count to abbreviated form (K, M, B)
 * @example formatViews(1234) => "1.2K"
 * @example formatViews(1500000) => "1.5M"
 */
export function formatViews(count: number): string {
    if (count >= 1_000_000_000) {
        return `${(count / 1_000_000_000).toFixed(1)}B`;
    }
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
}

/**
 * Format view count with Portuguese text (social media style)
 * @example formatViewsWithText(0) => "Nenhuma visualização"
 * @example formatViewsWithText(1) => "1 pessoa viu"
 * @example formatViewsWithText(173) => "173 pessoas viram"
 * @example formatViewsWithText(1500) => "1.5K pessoas viram"
 */
export function formatViewsWithText(count: number): string {
    if (count === 0) {
        return 'Nenhuma visualização';
    }
    if (count === 1) {
        return '1 pessoa viu';
    }
    return `${formatViews(count)} pessoas viram`;
}

/**
 * Format view count with icon (minimalist style like Instagram)
 * Returns just the number without text
 */
export function formatViewsMinimal(count: number): string {
    return formatViews(count);
}

/**
 * Format large numbers with thousand separators
 * @example formatNumber(1234567) => "1.234.567"
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('pt-BR');
}

/**
 * Format date relative to now (e.g., "2h ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora há pouco';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mês`;
    return `${Math.floor(diffDays / 365)}ano`;
}
