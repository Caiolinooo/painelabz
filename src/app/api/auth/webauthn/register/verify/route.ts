import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { getWebAuthnConfig, getAndClearChallenge, saveUserPasskey } from '@/lib/webauthn';

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

        const host = req.headers.get('host');
        const { rpID, expectedOrigin } = getWebAuthnConfig(host);

        // Verify response
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
            const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

            // Save to DB
            const b64CredentialID = credentialID;
            const b64PublicKey = Buffer.from(credentialPublicKey).toString('base64url');

            // Extracts transports array from client response, defaults to empty array
            const transports = body.response?.transports || [];

            await saveUserPasskey({
                user_id: userId,
                credential_id: b64CredentialID,
                public_key: b64PublicKey,
                counter: counter,
                device_type: credentialDeviceType,
                backed_up: credentialBackedUp,
                transports: transports.join(',')
            });

            return NextResponse.json({ success: true, message: 'Passkey registrado com sucesso!' });
        }

        return NextResponse.json({ error: 'Falha na verificação da credencial' }, { status: 400 });

    } catch (error: any) {
        console.error('Error verifying webauthn register:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
