import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { storeSession, mergeCookies } from '@/lib/poliweb-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLIWEB_ANTIGO_BASE = 'https://www.policlinicaweb.com.br';

/**
 * POST /api/poliweb-antigo/login
 * Performs auto-login to old Poliweb (ASP.NET Web Forms)
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const authResult = verifyToken(token);
        if (!authResult) {
            return NextResponse.json(
                { success: false, error: 'Token inválido' },
                { status: 401 }
            );
        }

        // Get credentials for this user (both novo and antigo)
        const client = await supabaseAdmin;
        const { data: credentials, error: credError } = await client
            .from('poliweb_credentials')
            .select('username, password, username_antigo, password_antigo')
            .eq('user_id', authResult.userId)
            .single();

        if (credError || !credentials) {
            return NextResponse.json(
                { success: false, error: 'Credenciais Poliweb não configuradas. Contate o administrador.' },
                { status: 404 }
            );
        }

        // Use antigo credentials if available, otherwise fall back to novo credentials
        const username = credentials.username_antigo || credentials.username;
        const password = credentials.password_antigo || credentials.password;

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Credenciais Poliweb Antigo não configuradas. Contate o administrador.' },
                { status: 404 }
            );
        }

        // Step 1: GET login page to get session cookie and hidden fields
        const loginPageResponse = await fetch(`${POLIWEB_ANTIGO_BASE}/Login.aspx`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            redirect: 'manual',
        });

        const loginPageHtml = await loginPageResponse.text();
        const initialCookies = loginPageResponse.headers.getSetCookie?.() || [];

        // Extract ViewState and EventValidation hidden fields
        const viewStateMatch = loginPageHtml.match(/__VIEWSTATE"[^>]*value="([^"]+)"/);
        const eventValidationMatch = loginPageHtml.match(/__EVENTVALIDATION"[^>]*value="([^"]+)"/);
        const viewStateGeneratorMatch = loginPageHtml.match(/__VIEWSTATEGENERATOR"[^>]*value="([^"]+)"/);

        if (!viewStateMatch) {
            console.error('Não foi possível encontrar __VIEWSTATE na página de login');
        }

        // Step 2: POST login form
        const formBody = new URLSearchParams();
        formBody.append('username', username);
        formBody.append('password', password);
        
        if (viewStateMatch) {
            formBody.append('__VIEWSTATE', viewStateMatch[1]);
        }
        if (eventValidationMatch) {
            formBody.append('__EVENTVALIDATION', eventValidationMatch[1]);
        }
        if (viewStateGeneratorMatch) {
            formBody.append('__VIEWSTATEGENERATOR', viewStateGeneratorMatch[1]);
        }

        const loginResponse = await fetch(`${POLIWEB_ANTIGO_BASE}/Login.aspx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': initialCookies.join('; '),
                'Origin': POLIWEB_ANTIGO_BASE,
                'Referer': `${POLIWEB_ANTIGO_BASE}/Login.aspx`,
            },
            body: formBody.toString(),
            redirect: 'manual',
        });

        const sessionCookies = loginResponse.headers.getSetCookie?.() || [];

        // Check if login succeeded
        let isLoggedIn = false;
        let errorMessage = null;

        if (loginResponse.status === 302) {
            const location = loginResponse.headers.get('location');
            isLoggedIn = location && !location.includes('Login') && !location.includes('Erro') && !location.includes('erro');
        } else if (loginResponse.status === 200) {
            const bodyText = await loginResponse.text();
            // If still has login form, login failed
            if (bodyText.includes('name="username"') || bodyText.includes('name="password"')) {
                // Check for error message
                if (bodyText.includes('class="error"') || bodyText.includes('class="erro"')) {
                    errorMessage = 'Credenciais inválidas. Verifique seu email e senha no Poliweb Antigo.';
                } else {
                    errorMessage = 'Falha no login. Verifique suas credenciais.';
                }
            } else {
                isLoggedIn = true;
            }
        }

        // Merge all cookies
        const allCookies = mergeCookies(initialCookies, sessionCookies);

        if (isLoggedIn) {
            // Store session in memory for the proxy to use
            storeSession(authResult.userId, allCookies, '', 'antigo');

            return NextResponse.json({
                success: true,
                cookies: allCookies,
                dashboardUrl: `${POLIWEB_ANTIGO_BASE}/`,
            });
        }

        return NextResponse.json({
            success: false,
            error: errorMessage || 'Falha no login. Verifique suas credenciais do Poliweb Antigo.'
        }, { status: 401 });

    } catch (error) {
        console.error('Erro no auto-login Poliweb Antigo:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao realizar login automático no Poliweb Antigo' },
            { status: 500 }
        );
    }
}
