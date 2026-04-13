/**
 * Shared session store for Poliweb proxy (both new and old versions)
 * Stores authenticated session cookies per user
 * Used by login APIs and proxies for both Poliweb systems
 */

interface PoliwebSession {
    cookies: string[];
    csrfToken: string;
    timestamp: number;
}

// Separate session stores for each Poliweb version
const sessionStoreNovo = new Map<string, PoliwebSession>();
const sessionStoreAntigo = new Map<string, PoliwebSession>();

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

export type PoliwebVersion = 'novo' | 'antigo';

/**
 * Get session for a specific user and Poliweb version
 */
export function getStoredSession(userId: string, version: PoliwebVersion = 'novo'): PoliwebSession | null {
    const store = version === 'novo' ? sessionStoreNovo : sessionStoreAntigo;
    const session = store.get(userId);
    if (!session) return null;
    if (Date.now() - session.timestamp > SESSION_TTL) {
        store.delete(userId);
        return null;
    }
    return session;
}

/**
 * Store session for a specific user and Poliweb version
 */
export function storeSession(userId: string, cookies: string[], csrfToken: string, version: PoliwebVersion = 'novo'): void {
    const store = version === 'novo' ? sessionStoreNovo : sessionStoreAntigo;
    store.set(userId, {
        cookies,
        csrfToken,
        timestamp: Date.now(),
    });
}

/**
 * Clear session for a specific user and version
 */
export function clearSession(userId: string, version?: PoliwebVersion): void {
    if (!version || version === 'novo') {
        sessionStoreNovo.delete(userId);
    }
    if (!version || version === 'antigo') {
        sessionStoreAntigo.delete(userId);
    }
}

/**
 * Clear ALL sessions for a user (both versions)
 */
export function clearAllSessions(userId: string): void {
    sessionStoreNovo.delete(userId);
    sessionStoreAntigo.delete(userId);
}

/**
 * Merge cookies, keeping the most recent version of each cookie
 */
export function mergeCookies(existing: string[], newCookies: string[]): string[] {
    const cookieMap = new Map<string, string>();
    existing.forEach(c => {
        const name = c.split('=')[0]?.split(';')[0];
        if (name) cookieMap.set(name, c);
    });
    newCookies.forEach(c => {
        const name = c.split('=')[0]?.split(';')[0];
        if (name) cookieMap.set(name, c);
    });
    return Array.from(cookieMap.values());
}

/**
 * Build Cookie header string from cookie array
 */
export function buildCookieHeader(cookies: string[]): string {
    if (!cookies || cookies.length === 0) return '';
    return cookies
        .map(c => {
            const parts = c.split(';');
            return parts[0];
        })
        .join('; ');
}

/**
 * Extract CSRF/antiforgery token from cookies
 */
export function extractCsrfTokenFromCookies(cookies: string[]): string | null {
    for (const cookie of cookies) {
        if (cookie.includes('Antiforgery')) {
            const match = cookie.match(/=([^;]+)/);
            if (match) return match[1];
        }
    }
    return null;
}
