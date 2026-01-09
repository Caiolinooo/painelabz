import { NextRequest, NextResponse } from 'next/server';

// HTTP Tunnel for Guacamole - alternative to WebSocket
// Guacamole uses this for long-polling when WebSocket isn't available

const GUACAMOLE_BASE_URL = 'https://vm.groupabz.com/guacamole';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/tunnel${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole HTTP Tunnel GET] ${url}`);

    try {
        const headers = new Headers();
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) headers.set('cookie', cookieHeader);

        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) headers.set('Guacamole-Token', guacToken);

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const body = await response.arrayBuffer();

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', contentType);
        responseHeaders.set('Cache-Control', 'no-cache, no-store');

        // Forward Set-Cookie
        const setCookies = response.headers.getSetCookie?.() || [];
        setCookies.forEach(cookie => {
            responseHeaders.append('Set-Cookie', cookie);
        });

        return new NextResponse(body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole HTTP Tunnel] Error:', error);
        return NextResponse.json(
            { error: 'Tunnel error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/tunnel${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole HTTP Tunnel POST] ${url}`);

    try {
        const headers = new Headers();
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) headers.set('cookie', cookieHeader);

        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) headers.set('Guacamole-Token', guacToken);

        const contentType = request.headers.get('content-type');
        if (contentType) headers.set('Content-Type', contentType);

        const body = await request.text();

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });

        const responseContentType = response.headers.get('content-type') || 'application/octet-stream';
        const responseBody = await response.text();

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', responseContentType);
        responseHeaders.set('Cache-Control', 'no-cache, no-store');

        return new NextResponse(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole HTTP Tunnel] Error:', error);
        return NextResponse.json(
            { error: 'Tunnel error', details: String(error) },
            { status: 500 }
        );
    }
}
