import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLIWEB_ANTIGO_BASE = 'https://www.policlinicaweb.com.br';

/**
 * GET /api/poliweb-antigo-proxy
 * Root proxy - encaminha para o path inicial do Poliweb Antigo
 */
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const targetPath = url.searchParams.get('path') || '/Login.aspx';
        const targetUrl = `${POLIWEB_ANTIGO_BASE}${targetPath}`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            redirect: 'manual',
        });

        const html = await response.text();
        const cookies = response.headers.getSetCookie?.() || [];
        const rewrittenHtml = rewriteRootHtml(html);

        const nextResponse = new NextResponse(rewrittenHtml, {
            status: response.status,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });

        cookies.forEach(cookie => {
            nextResponse.headers.append('Set-Cookie', cookie);
        });

        return nextResponse;
    } catch (error) {
        console.error('Erro no proxy Poliweb Antigo (root GET):', error);
        return NextResponse.json(
            { error: 'Erro ao conectar ao Poliweb Antigo' },
            { status: 502 }
        );
    }
}

/**
 * POST /api/poliweb-antigo-proxy
 * Encaminha POSTs genéricos para o path inicial (compatibilidade básica)
 */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const targetPath = url.searchParams.get('path') || '/Login.aspx';
        const targetUrl = `${POLIWEB_ANTIGO_BASE}${targetPath}`;

        const contentType = request.headers.get('content-type') || '';
        const body = await request.arrayBuffer();

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                ...(contentType ? { 'Content-Type': contentType } : {}),
            },
            body,
            redirect: 'manual',
        });

        const html = await response.text();
        const rewrittenHtml = rewriteRootHtml(html);

        return new NextResponse(rewrittenHtml, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Erro no proxy Poliweb Antigo (root POST):', error);
        return NextResponse.json(
            { error: 'Erro ao processar requisição' },
            { status: 502 }
        );
    }
}

function rewriteRootHtml(html: string): string {
    let result = html;

    result = result.replace(/(href|src|action)=["'](\/(?!\/)[^"']*)["']/g, (match, attr, path) => {
        if (path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('mailto:') || path.startsWith('#')) {
            return match;
        }
        return `${attr}="/api/poliweb-antigo-proxy${path}"`;
    });

    result = result.replace(/(href|src|action)=["']https:\/\/www\.policlinicaweb\.com\.br\//g, '$1="/api/poliweb-antigo-proxy/');
    result = result.replace(/url\(['"]?(\/(?!\/)[^'")]+)['"]?\)/g, (match, path) => `url('/api/poliweb-antigo-proxy${path}')`);

    const proxyRuntimePatch = `<script>(function(){try{var p='/api/poliweb-antigo-proxy';var rw=function(u){return(typeof u==='string'&&u.charAt(0)==='/'&&!u.startsWith(p))?p+u:u;};var of=window.fetch;if(typeof of==='function'){window.fetch=function(input,init){try{if(typeof input==='string'){input=rw(input);}else if(input&&typeof input.url==='string'){input=rw(input.url);}}catch(e){}return of.call(this,input,init);};}var oo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{u=rw(u);}catch(e){}return oo.apply(this,[m,u].concat([].slice.call(arguments,2)));};}catch(e){}})();</script>`;
    if (result.includes('</head>')) return result.replace('</head>', `${proxyRuntimePatch}</head>`);
    if (result.includes('</body>')) return result.replace('</body>', `${proxyRuntimePatch}</body>`);
    return `${proxyRuntimePatch}${result}`;
}

