import { NextRequest, NextResponse } from 'next/server';
import { getStoredSession, mergeCookies, buildCookieHeader, storeSession } from '@/lib/poliweb-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLIWEB_ANTIGO_BASE = 'https://www.policlinicaweb.com.br';
const FORWARDED_RESPONSE_HEADERS = [
    'content-type',
    'content-length',
    'content-encoding',
    'cache-control',
    'etag',
    'last-modified',
    'accept-ranges',
    'expires',
];

function guessContentTypeFromPath(pathname: string): string | null {
    const normalized = pathname.toLowerCase();
    if (normalized.endsWith('.ttf')) return 'font/ttf';
    if (normalized.endsWith('.otf')) return 'font/otf';
    if (normalized.endsWith('.woff')) return 'font/woff';
    if (normalized.endsWith('.woff2')) return 'font/woff2';
    if (normalized.endsWith('.css')) return 'text/css; charset=utf-8';
    if (normalized.endsWith('.js')) return 'application/javascript; charset=utf-8';
    if (normalized.endsWith('.svg')) return 'image/svg+xml';
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
    if (normalized.endsWith('.gif')) return 'image/gif';
    return null;
}

function copyAllowedHeaders(upstreamHeaders: Headers, fallbackPath: string): Headers {
    const headers = new Headers();
    for (const headerName of FORWARDED_RESPONSE_HEADERS) {
        const value = upstreamHeaders.get(headerName);
        if (value) {
            headers.set(headerName, value);
        }
    }

    if (!headers.get('content-type')) {
        const guessed = guessContentTypeFromPath(fallbackPath);
        if (guessed) {
            headers.set('content-type', guessed);
        }
    }
    return headers;
}

function isFontPath(pathname: string): boolean {
    const normalized = pathname.toLowerCase();
    return normalized.endsWith('.ttf') || normalized.endsWith('.otf') || normalized.endsWith('.woff') || normalized.endsWith('.woff2');
}

/**
 * GET /api/poliweb-antigo-proxy/[...path]
 * Serves old Poliweb content through proxy with session cookies injected
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const pathSegments = await Promise.resolve(params.path);
        const targetPath = '/' + pathSegments.join('/');

        // Get user ID from authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
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

        // Get stored session for old Poliweb
        const session = userId ? getStoredSession(userId, 'antigo') : null;
        const cookieHeader = session ? buildCookieHeader(session.cookies) : '';

        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const fullUrl = searchParams
            ? `${POLIWEB_ANTIGO_BASE}${targetPath}?${searchParams}`
            : `${POLIWEB_ANTIGO_BASE}${targetPath}`;

        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
                let rewrittenLocation = `${new URL(location, POLIWEB_ANTIGO_BASE).pathname}${new URL(location, POLIWEB_ANTIGO_BASE).search}`;
                if (rewrittenLocation === '/' || rewrittenLocation === '') {
                    rewrittenLocation = '/Login.aspx';
                }
                return NextResponse.redirect(new URL(`/api/poliweb-antigo-proxy${rewrittenLocation}`, request.url));
            }
        }

        if (contentType.includes('text/html')) {
            const html = await response.text();
            const rewrittenHtml = rewriteHtml(html, targetPath);

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
        const headers = copyAllowedHeaders(response.headers, targetPath);
        if (!headers.get('cache-control')) {
            headers.set('cache-control', 'public, max-age=86400');
        }

        if (isFontPath(targetPath) && (headers.get('content-type') || '').includes('text/html')) {
            console.warn('Poliweb antigo proxy returned HTML for font request', {
                targetPath,
                status: response.status,
            });
        }

        return new NextResponse(body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    } catch (error) {
        console.error('Erro no proxy Poliweb Antigo GET:', error);
        return NextResponse.json(
            { error: 'Erro ao conectar ao Poliweb Antigo' },
            { status: 502 }
        );
    }
}

/**
 * POST /api/poliweb-antigo-proxy/[...path]
 * Handles form submissions through proxy with session cookies
 */
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const pathSegments = await Promise.resolve(params.path);
        const targetPath = '/' + pathSegments.join('/');

        // Get user session
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        let userId: string | null = null;

        if (token) {
            try {
                const { verifyToken } = await import('@/lib/auth');
                const authResult = verifyToken(token);
                if (authResult) {
                    userId = authResult.userId;
                }
            } catch (e) {
                // Token invalid
            }
        }

        const session = userId ? getStoredSession(userId, 'antigo') : null;
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

        const response = await fetch(`${POLIWEB_ANTIGO_BASE}${targetPath}`, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Content-Type': contentType,
                'Origin': POLIWEB_ANTIGO_BASE,
                'Referer': POLIWEB_ANTIGO_BASE,
                ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
            },
            body,
            redirect: 'manual',
        });

        // Handle session cookies from response
        const responseCookies = response.headers.getSetCookie?.() || [];
        if (responseCookies.length > 0 && userId) {
            const existingSession = getStoredSession(userId, 'antigo');
            const existingCookies = existingSession?.cookies || [];
            const mergedCookies = mergeCookies(existingCookies, responseCookies);
            storeSession(userId, mergedCookies, '', 'antigo');
        }

        const responseContentType = response.headers.get('content-type') || '';

        // Handle redirects
        if ((response.status === 302 || response.status === 301)) {
            const location = response.headers.get('location');
            if (location) {
                const resolvedLocation = new URL(location, POLIWEB_ANTIGO_BASE);
                const rewrittenLocation = `${resolvedLocation.pathname}${resolvedLocation.search}`;
                return NextResponse.redirect(new URL(`/api/poliweb-antigo-proxy${rewrittenLocation}`, request.url));
            }
        }

        if (responseContentType.includes('text/html')) {
            const html = await response.text();
            const rewrittenHtml = rewriteHtml(html, targetPath);

            return new NextResponse(rewrittenHtml, {
                status: response.status,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
            });
        }

        const responseBody = await response.arrayBuffer();
        const headers = copyAllowedHeaders(response.headers, targetPath);
        if (!headers.get('content-type') && responseContentType) {
            headers.set('content-type', responseContentType);
        }

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    } catch (error) {
        console.error('Erro no proxy Poliweb Antigo POST:', error);
        return NextResponse.json(
            { error: 'Erro ao processar requisição' },
            { status: 502 }
        );
    }
}

function rewriteHtml(html: string, currentPath: string): string {
    let result = html;
    const preservedBlocks: string[] = [];
    const preserveRegex = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
    result = result.replace(preserveRegex, (match) => {
        const key = `__ABZ_PRESERVED_BLOCK_${preservedBlocks.length}__`;
        preservedBlocks.push(match);
        return key;
    });

    // Rewrite relative URLs to go through our proxy (without touching script/style blocks)
    result = result.replace(/\b(href|src|action)=["'](\/(?!\/)[^"']*)["']/gi, (match, attr, path) => {
        if (path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('mailto:') || path.startsWith('#')) {
            return match;
        }
        return `${attr}="/api/poliweb-antigo-proxy${path}"`;
    });

    // Rewrite absolute URLs to old Poliweb
    result = result.replace(/(href|src|action)=["']https:\/\/www\.policlinicaweb\.com\.br\//g, '$1="/api/poliweb-antigo-proxy/');

    // Rewrite CSS url() references
    result = result.replace(/url\(['"]?(\/(?!\/)[^'")]+)['"]?\)/g, (match, path) => {
        return `url('/api/poliweb-antigo-proxy${path}')`;
    });

    // Fix form actions to go through proxy
    result = result.replace(/action="\/Login\.aspx"/g, 'action="/api/poliweb-antigo-proxy/Login.aspx"');

    // Force runtime XHR/fetch root-relative requests through proxy too
    // (legacy scripts call endpoints like /_recursos/... directly at localhost root)
    const proxyRuntimePatch = `<script>(function(){try{if(window.__abzPoliwebProxyPatchApplied){return;}window.__abzPoliwebProxyPatchApplied=true;var p='/api/poliweb-antigo-proxy';var rw=function(u){return(typeof u==='string'&&u.charAt(0)==='/'&&!u.startsWith(p))?p+u:u;};var of=window.fetch;if(typeof of==='function'){window.fetch=function(input,init){try{if(typeof input==='string'){input=rw(input);}else if(input&&typeof input.url==='string'){input=rw(input.url);} }catch(e){}return of.call(this,input,init);};}var oo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{u=rw(u);}catch(e){}return oo.apply(this,[m,u].concat([].slice.call(arguments,2)));};}catch(e){}})();</script>`;
    if (result.includes('</head>')) {
        result = result.replace('</head>', `${proxyRuntimePatch}</head>`);
    } else if (result.includes('</body>')) {
        result = result.replace('</body>', `${proxyRuntimePatch}</body>`);
    } else {
        result = `${proxyRuntimePatch}${result}`;
    }

    result = result.replace(/__ABZ_PRESERVED_BLOCK_(\d+)__/g, (match, index) => {
        return preservedBlocks[Number(index)] ?? match;
    });

    return result;
}
