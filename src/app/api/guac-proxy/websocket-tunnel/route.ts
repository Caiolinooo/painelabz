import { NextRequest, NextResponse } from 'next/server';

// WebSocket tunnel for Guacamole RDP/VNC connections
// Note: This is a fallback HTTP tunnel - true WebSocket requires custom server

const GUACAMOLE_BASE_URL = 'https://vm.groupabz.com/guacamole';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/websocket-tunnel${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole WebSocket Tunnel GET] ${url}`);

    try {
        const headers = new Headers();
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) headers.set('cookie', cookieHeader);

        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) headers.set('Guacamole-Token', guacToken);

        // Check if this is a WebSocket upgrade request
        const upgradeHeader = request.headers.get('upgrade');
        if (upgradeHeader?.toLowerCase() === 'websocket') {
            // Next.js API routes don't support WebSocket upgrades directly
            // Return instructions to use direct connection
            console.log('[Guacamole WebSocket] Upgrade request detected - not supported in API routes');
            return new NextResponse(null, {
                status: 426,
                statusText: 'Upgrade Required',
                headers: {
                    'Content-Type': 'text/plain',
                    'X-Guacamole-Error': 'WebSocket upgrade not supported through proxy. Use HTTP tunnel.'
                }
            });
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const body = await response.arrayBuffer();

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', contentType);

        return new NextResponse(body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole WebSocket Tunnel] Error:', error);
        return NextResponse.json(
            { error: 'Tunnel error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${GUACAMOLE_BASE_URL}/websocket-tunnel${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Guacamole WebSocket Tunnel POST] ${url}`);

    try {
        const headers = new Headers();
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) headers.set('cookie', cookieHeader);

        const guacToken = request.headers.get('guacamole-token');
        if (guacToken) headers.set('Guacamole-Token', guacToken);

        const contentType = request.headers.get('content-type');
        if (contentType) headers.set('Content-Type', contentType);

        const body = await request.arrayBuffer();

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });

        const responseContentType = response.headers.get('content-type') || 'application/octet-stream';
        const responseBody = await response.arrayBuffer();

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', responseContentType);

        return new NextResponse(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[Guacamole WebSocket Tunnel] Error:', error);
        return NextResponse.json(
            { error: 'Tunnel error', details: String(error) },
            { status: 500 }
        );
    }
}
