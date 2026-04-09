import { NextRequest, NextResponse } from 'next/server';
import { getStoredSession, mergeCookies, buildCookieHeader, extractCsrfTokenFromCookies, storeSession } from '@/lib/poliweb-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLIWEB_BASE = 'https://poliweb.policlinicamacae.com.br';

/**
 * Extract JWT token from request cookies or Authorization header
 * Priority: Authorization header > Cookie header
 */
function extractToken(request: NextRequest): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.replace('Bearer ', '');
    if (headerToken) {
        return headerToken;
    }

    // Fallback to cookies (used by iframe requests)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    
    for (const cookie of cookies) {
        if (cookie.startsWith('abzToken=')) {
            return cookie.split('=')[1]?.split(';')[0] || null;
        }
        if (cookie.startsWith('token=')) {
            return cookie.split('=')[1]?.split(';')[0] || null;
        }
    }

    return null;
}

/**
 * GET /api/poliweb-proxy/[...path]
 * Serves Poliweb content through proxy with session cookies injected
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const pathSegments = await Promise.resolve(params.path);
        const targetPath = '/' + pathSegments.join('/');

        // Get user ID from token (Authorization header OR cookies)
        const token = extractToken(request);
        let userId: string | null = null;

        if (token) {
            try {
                const { verifyToken } = await import('@/lib/auth');
                const authResult = verifyToken(token);
                if (authResult) {
                    userId = authResult.userId;
                }
            } catch (e) {
                // Token invalid, continue without session
            }
        }

        // Get stored session
        const session = userId ? getStoredSession(userId) : null;
        const cookieHeader = session ? buildCookieHeader(session.cookies) : '';

        // If no session found, redirect to /poliweb to trigger re-login
        if (!session && userId) {
            return new NextResponse(
                `<html><head><script>if(window.top!==window){window.top.location.href='/poliweb'}else{window.location.href='/poliweb'}</script></head><body>Redirecionando para login...</body></html>`,
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        }

        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const fullUrl = searchParams
            ? `${POLIWEB_BASE}${targetPath}?${searchParams}`
            : `${POLIWEB_BASE}${targetPath}`;

        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
            },
            redirect: 'manual',
        });

        const contentType = response.headers.get('content-type') || '';

        // Handle redirects
        if (response.status === 302 || response.status === 301) {
            const location = response.headers.get('location');
            if (location) {
                // If redirecting to login and we have a session, session expired
                if (location.includes('Login') && session && userId) {
                    return new NextResponse(
                        `<html><head><meta http-equiv="refresh" content="0;url=/poliweb"></head></html>`,
                        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                    );
                }
                // Rewrite redirect URL to go through proxy
                const rewrittenLocation = location.replace(POLIWEB_BASE, '');
                return NextResponse.redirect(new URL(`/api/poliweb-proxy${rewrittenLocation}`, request.url));
            }
        }

        if (contentType.includes('text/html')) {
            const html = await response.text();
            const rewrittenHtml = rewriteHtml(html);

            return new NextResponse(rewrittenHtml, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }

        // For non-HTML content (CSS, JS, images, etc.), proxy directly
        const body = await response.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(body, {
            status: response.status,
            headers,
        });
    } catch (error) {
        console.error('Erro no proxy Poliweb GET:', error);
        return NextResponse.json(
            { error: 'Erro ao conectar ao Poliweb' },
            { status: 502 }
        );
    }
}

/**
 * POST /api/poliweb-proxy/[...path]
 * Handles form submissions through proxy with session cookies
 */
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const pathSegments = await Promise.resolve(params.path);
        const targetPath = '/' + pathSegments.join('/');

        // Get user session from token (Authorization header OR cookies)
        const token = extractToken(request);
        let userId: string | null = null;

        if (token) {
            try {
                const { verifyToken } = await import('@/lib/auth');
                const authResult = verifyToken(token);
                if (authResult) {
                    userId = authResult.userId;
                }
            } catch (e) {
                // Token invalid, continue without session
            }
        }

        const session = userId ? getStoredSession(userId) : null;
        const cookieHeader = session ? buildCookieHeader(session.cookies) : '';

        const contentType = request.headers.get('content-type') || '';
        let body: string | ArrayBuffer;

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            const formParams = new URLSearchParams();
            formData.forEach((value, key) => {
                formParams.append(key, value as string);
            });
            body = formParams.toString();
        } else {
            body = await request.arrayBuffer();
        }

        const response = await fetch(`${POLIWEB_BASE}${targetPath}`, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Content-Type': contentType,
                ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
            },
            body,
            redirect: 'manual',
        });

        // Handle session cookies from response
        const responseCookies = response.headers.getSetCookie?.() || [];
        if (responseCookies.length > 0 && userId) {
            const existingSession = getStoredSession(userId);
            const existingCookies = existingSession?.cookies || [];
            const mergedCookies = mergeCookies(existingCookies, responseCookies);
            const csrfToken = session?.csrfToken || extractCsrfTokenFromCookies(responseCookies) || '';
            if (csrfToken) {
                storeSession(userId, mergedCookies, csrfToken);
            }
        }

        const responseContentType = response.headers.get('content-type') || '';

        // Handle redirects
        if ((response.status === 302 || response.status === 301)) {
            const location = response.headers.get('location');
            if (location) {
                const rewrittenLocation = location.replace(POLIWEB_BASE, '');
                return NextResponse.redirect(new URL(`/api/poliweb-proxy${rewrittenLocation}`, request.url));
            }
        }

        if (responseContentType.includes('text/html')) {
            const html = await response.text();
            const rewrittenHtml = rewriteHtml(html);

            return new NextResponse(rewrittenHtml, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
            });
        }

        const responseBody = await response.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', responseContentType);

        return new NextResponse(responseBody, {
            status: response.status,
            headers,
        });
    } catch (error) {
        console.error('Erro no proxy Poliweb POST:', error);
        return NextResponse.json(
            { error: 'Erro ao processar requisição' },
            { status: 502 }
        );
    }
}

function rewriteHtml(html: string): string {
    let result = html;

    // Rewrite relative URLs to go through our proxy
    result = result.replace(/(href|src|action)="(\/(?!\/)[^"]*)"/g, (match, attr, path) => {
        if (path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('mailto:') || path.startsWith('#')) {
            return match;
        }
        return `${attr}="/api/poliweb-proxy${path}"`;
    });

    // Rewrite absolute URLs to Poliweb
    result = result.replace(/(href|src|action)="https:\/\/poliweb\.policlinicamacae\.com\.br\//g, '$1="/api/poliweb-proxy/');

    // Rewrite CSS url() references
    result = result.replace(/url\(['"]?(\/(?!\/)[^'")]+)['"]?\)/g, (match, path) => {
        return `url('/api/poliweb-proxy${path}')`;
    });

    // Fix form actions to go through proxy
    result = result.replace(/action="\/Identity\/Account\/Login"/g, 'action="/api/poliweb-proxy/Identity/Account/Login"');

    return result;
}
