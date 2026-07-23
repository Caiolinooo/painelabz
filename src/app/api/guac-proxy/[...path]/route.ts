import { NextRequest, NextResponse } from 'next/server';

const GUACAMOLE_BASE_URL = 'https://vm.groupabz.com/guacamole';

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
    const params = await props.params;
    const path = params.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole Proxy GET] ${url}`);

    try {
        const headers = new Headers();
        // Forward relevant headers
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            headers.set('cookie', cookieHeader);
        }
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers.set('authorization', authHeader);
        }
        // Forward Guacamole-Token header (critical for session auth)
        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) {
            headers.set('Guacamole-Token', guacToken);
            console.log('[Guacamole Proxy] Forwarding Guacamole-Token');
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
            redirect: 'follow',
        });

        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Handle different content types
        let body: ArrayBuffer | string;
        if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('html') || contentType.includes('css')) {
            let text = await response.text();

            // Rewrite URLs in HTML and JS to use our proxy
            if (contentType.includes('html') || contentType.includes('javascript')) {
                // Replace absolute URLs to guacamole with our proxy
                text = text.replace(/https?:\/\/vm\.groupabz\.com\/guacamole/g, '/api/guac-proxy');
                // Replace relative API calls that start with api/
                text = text.replace(/"api\//g, '"/api/guac-proxy/api/');
                // Replace relative paths that might be used in fetch/XHR
                text = text.replace(/['"]\/guacamole\//g, (match) => match[0] + '/api/guac-proxy/');
            }

            body = text;
        } else {
            body = await response.arrayBuffer();
        }

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', contentType);

        // Forward cache headers
        const cacheControl = response.headers.get('cache-control');
        if (cacheControl) {
            responseHeaders.set('Cache-Control', cacheControl);
        }

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
        console.error('[Guacamole Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Proxy error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
    const params = await props.params;
    const path = params.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole Proxy POST] ${url}`);

    try {
        const contentType = request.headers.get('content-type') || '';

        let body: string | FormData | ArrayBuffer;
        if (contentType.includes('application/x-www-form-urlencoded')) {
            body = await request.text();
        } else if (contentType.includes('multipart/form-data')) {
            body = await request.formData();
        } else if (contentType.includes('json')) {
            body = JSON.stringify(await request.json());
        } else {
            body = await request.arrayBuffer();
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);

        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            headers.set('cookie', cookieHeader);
        }
        // Forward Guacamole-Token header
        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) {
            headers.set('Guacamole-Token', guacToken);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: body as BodyInit,
            redirect: 'follow',
        });

        const responseContentType = response.headers.get('content-type') || 'application/octet-stream';
        let responseBody: ArrayBuffer | string;

        if (responseContentType.includes('text') || responseContentType.includes('json')) {
            responseBody = await response.text();
        } else {
            responseBody = await response.arrayBuffer();
        }

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', responseContentType);

        const setCookies = response.headers.getSetCookie?.() || [];
        setCookies.forEach(cookie => {
            responseHeaders.append('Set-Cookie', cookie);
        });

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Proxy error', details: String(error) },
            { status: 500 }
        );
    }
}

// Handle other methods (PUT, DELETE, PATCH)
export async function PUT(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
    return handleGenericMethod(request, props, 'PUT');
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
    return handleGenericMethod(request, props, 'DELETE');
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
    return handleGenericMethod(request, props, 'PATCH');
}

async function handleGenericMethod(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> },
    method: string
) {
    const params = await props.params;
    const path = params.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole Proxy ${method}] ${url}`);

    try {
        const contentType = request.headers.get('content-type') || '';
        let body: string | ArrayBuffer | undefined;

        if (contentType) {
            if (contentType.includes('json')) {
                body = JSON.stringify(await request.json());
            } else {
                body = await request.text();
            }
        }

        const headers = new Headers();
        if (contentType) headers.set('Content-Type', contentType);

        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) headers.set('cookie', cookieHeader);

        // Forward Guacamole-Token header
        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) headers.set('Guacamole-Token', guacToken);

        const response = await fetch(url, {
            method,
            headers,
            body,
            redirect: 'follow',
        });

        const responseContentType = response.headers.get('content-type') || 'application/octet-stream';

        // Handle 204 No Content - cannot have body
        if (response.status === 204) {
            return new NextResponse(null, {
                status: 204,
                statusText: 'No Content',
            });
        }

        let responseBody: ArrayBuffer | string;

        if (responseContentType.includes('text') || responseContentType.includes('json')) {
            responseBody = await response.text();
        } else {
            responseBody = await response.arrayBuffer();
        }

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', responseContentType);

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Proxy error', details: String(error) },
            { status: 500 }
        );
    }
}
