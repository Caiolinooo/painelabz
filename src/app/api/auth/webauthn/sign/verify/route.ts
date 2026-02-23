import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { getWebAuthnConfig, getAndClearChallenge, updatePasskeyCounter } from '@/lib/webauthn';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            const tokenCookie = req.cookies.get('abzToken') || req.cookies.get('token');
            if (tokenCookie) {
                token = tokenCookie.value;
            }
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.userId;
        const body = await req.json();

        // Get challenge
        const expectedChallenge = await getAndClearChallenge(userId);

        if (!expectedChallenge) {
            return NextResponse.json({ error: 'Nenhum desafio WebAuthn ativo encontrado. Tente novamente.' }, { status: 400 });
        }

        const credentialIdBase64url = body.id;

        // Find the passkey in DB
        const { data: passkey } = await supabaseAdmin
            .from('user_passkeys')
            .select('*')
            .eq('credential_id', credentialIdBase64url)
            .eq('user_id', userId) // guarantee it's from this user
            .single();

        if (!passkey) {
            return NextResponse.json({ error: 'Credencial não encontrada ou não pertence a este usuário.' }, { status: 404 });
        }

        const host = req.headers.get('host');
        const { rpID, expectedOrigin } = getWebAuthnConfig(host);

        const credential = {
            id: passkey.credential_id,
            publicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64url')),
            counter: Number(passkey.counter),
            transports: passkey.transports ? (passkey.transports.split(',') as any[]) : undefined,
        };

        // Verify response
        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            credential,
            requireUserVerification: true, // we required it in options
        });

        if (verification.verified && verification.authenticationInfo) {
            const { newCounter } = verification.authenticationInfo;

            // Update counter
            await updatePasskeyCounter(passkey.credential_id, newCounter);

            return NextResponse.json({ success: true, message: 'Assinatura biométrica validada com sucesso!' });
        }

        return NextResponse.json({ error: 'Falha na verificação da assinatura' }, { status: 400 });

    } catch (error: any) {
        console.error('Error verifying webauthn sign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
