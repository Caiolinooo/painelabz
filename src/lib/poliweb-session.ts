/**
 * Shared session store for Poliweb proxy
 * Stores authenticated session cookies per user
 * Used by both /api/poliweb/login and /api/poliweb-proxy/[...path]
 */

interface PoliwebSession {
    cookies: string[];
    csrfToken: string;
    timestamp: number;
}

const sessionStore = new Map<string, PoliwebSession>();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

export function getStoredSession(userId: string): PoliwebSession | null {
    const session = sessionStore.get(userId);
    if (!session) return null;
    if (Date.now() - session.timestamp > SESSION_TTL) {
        sessionStore.delete(userId);
        return null;
    }
    return session;
}

export function storeSession(userId: string, cookies: string[], csrfToken: string): void {
    sessionStore.set(userId, {
        cookies,
        csrfToken,
        timestamp: Date.now(),
    });
}

export function clearSession(userId: string): void {
    sessionStore.delete(userId);
}

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

export function buildCookieHeader(cookies: string[]): string {
    if (!cookies || cookies.length === 0) return '';
    return cookies
        .map(c => {
            const parts = c.split(';');
            return parts[0];
        })
        .join('; ');
}

export function extractCsrfTokenFromCookies(cookies: string[]): string | null {
    for (const cookie of cookies) {
        if (cookie.includes('Antiforgery')) {
            const match = cookie.match(/=([^;]+)/);
            if (match) return match[1];
        }
    }
    return null;
}
