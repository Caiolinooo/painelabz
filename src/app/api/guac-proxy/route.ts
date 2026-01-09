import { NextRequest, NextResponse } from 'next/server';

const GUACAMOLE_BASE_URL = 'https://vm.groupabz.com/guacamole';

export async function GET(request: NextRequest) {
    // Root path - serve the Guacamole index page  
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole Proxy GET ROOT] ${url}`);

    try {
        const headers = new Headers();
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            headers.set('cookie', cookieHeader);
        }
        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) {
            headers.set('Guacamole-Token', guacToken);
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
            redirect: 'follow',
        });

        const contentType = response.headers.get('content-type') || 'text/html';
        let body = await response.text();

        // CRITICAL: Inject base tag to fix relative path resolution
        // This makes the browser resolve all relative URLs from /api/guac-proxy/
        if (contentType.includes('html')) {
            // Insert base tag right after <head>
            body = body.replace(/<head([^>]*)>/i, '<head$1><base href="/api/guac-proxy/">');
        }

        // Rewrite URLs in HTML to use our proxy - be conservative
        // Replace absolute URLs to guacamole
        body = body.replace(/https?:\/\/vm\.groupabz\.com\/guacamole/g, '/api/guac-proxy');

        // Replace relative API paths (careful with this one)
        body = body.replace(/"api\//g, '"/api/guac-proxy/api/');

        // Replace /guacamole/ paths
        body = body.replace(/['"]\/guacamole\//g, (match) => match[0] + '/api/guac-proxy/');

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', contentType);

        // Forward Set-Cookie headers
        const setCookies = response.headers.getSetCookie?.() || [];
        setCookies.forEach(cookie => {
            responseHeaders.append('Set-Cookie', cookie);
        });

        return new NextResponse(body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole Proxy ROOT] Error:', error);
        return NextResponse.json(
            { error: 'Proxy error', details: String(error) },
            { status: 500 }
        );
    }
}
