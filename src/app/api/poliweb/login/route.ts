import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { storeSession, mergeCookies } from '@/lib/poliweb-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLIWEB_BASE = 'https://poliweb.policlinicamacae.com.br';

/**
 * POST /api/poliweb/login
 * Performs auto-login to Poliweb using stored credentials
 * Stores session cookies for the proxy to use
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

        // Get credentials for this user
        const client = await supabaseAdmin;
        const { data: credentials, error: credError } = await client
            .from('poliweb_credentials')
            .select('username, password')
            .eq('user_id', authResult.userId)
            .single();

        if (credError || !credentials) {
            return NextResponse.json(
                { success: false, error: 'Credenciais Poliweb não configuradas. Contate o administrador.' },
                { status: 404 }
            );
        }

        const email = credentials.username;
        const password = credentials.password;

        // Step 1: GET login page to get CSRF token and initial cookies
        const loginPageResponse = await fetch(`${POLIWEB_BASE}/Identity/Account/Login`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            redirect: 'manual',
        });

        const loginPageHtml = await loginPageResponse.text();
        const initialCookies = loginPageResponse.headers.getSetCookie?.() || [];

        // Extract CSRF token from the HTML
        const csrfMatch = loginPageHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
        if (!csrfMatch) {
            console.error('Não foi possível encontrar CSRF token na página de login');
            return NextResponse.json(
                { success: false, error: 'Erro ao obter token de segurança do Poliweb' },
                { status: 500 }
            );
        }

        const csrfToken = csrfMatch[1];

        // Step 2: POST login form to the Identity endpoint
        const formBody = new URLSearchParams();
        formBody.append('Input.Email', email);
        formBody.append('Input.Password', password);
        formBody.append('Input.RememberMe', 'true');
        formBody.append('__RequestVerificationToken', csrfToken);

        const loginResponse = await fetch(`${POLIWEB_BASE}/Identity/Account/Login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': initialCookies.join('; '),
            },
            body: formBody.toString(),
            redirect: 'manual',
        });

        const sessionCookies = loginResponse.headers.getSetCookie?.() || [];
        const location = loginResponse.headers.get('location');

        // Check if login succeeded
        const isLoggedIn = loginResponse.status === 302 && location &&
            !location.includes('Login') &&
            !location.includes('Account');

        // Merge all cookies
        const allCookies = mergeCookies(initialCookies, sessionCookies);

        if (isLoggedIn || loginResponse.status === 200) {
            // If status 200, check if the response contains dashboard content
            if (loginResponse.status === 200) {
                const bodyText = await loginResponse.text();
                if (bodyText.includes('Input_Password') && bodyText.includes('Input_Email')) {
                    return NextResponse.json({
                        success: false,
                        error: 'Credenciais inválidas. Verifique seu email e senha no Poliweb.'
                    }, { status: 401 });
                }
            }

            // Get the dashboard page to extract a fresh CSRF token
            const dashboardPath = isLoggedIn && location ? location : '/PainelEmpresa';
            const dashboardUrl = `${POLIWEB_BASE}${dashboardPath}`;

            const dashboardResponse = await fetch(dashboardUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                    'Cookie': allCookies.join('; '),
                },
                redirect: 'manual',
            });

            const dashboardHtml = await dashboardResponse.text();
            const dashboardCookies = dashboardResponse.headers.getSetCookie?.() || [];

            // Extract fresh CSRF token from dashboard
            const dashboardCsrfMatch = dashboardHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
            const freshCsrfToken = dashboardCsrfMatch ? dashboardCsrfMatch[1] : csrfToken;

            // Merge all cookies
            const finalCookies = mergeCookies(allCookies, dashboardCookies);

            // Store session in memory for the proxy to use
            storeSession(authResult.userId, finalCookies, freshCsrfToken);

            return NextResponse.json({
                success: true,
                cookies: finalCookies,
                csrfToken: freshCsrfToken,
                dashboardUrl: `${POLIWEB_BASE}/PainelEmpresa`,
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Falha no login. Verifique suas credenciais do Poliweb.'
        }, { status: 401 });

    } catch (error) {
        console.error('Erro no auto-login Poliweb:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao realizar login automático no Poliweb' },
            { status: 500 }
        );
    }
}
