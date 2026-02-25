import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getWebAuthnConfig, updatePasskeyCounter } from '@/lib/webauthn';
import { supabaseAdmin } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Retrieve challenge from cookie
        const expectedChallenge = req.cookies.get('webauthn_challenge')?.value;

        if (!expectedChallenge) {
            return NextResponse.json({ error: 'WebAuthn session expired. Please try again.' }, { status: 400 });
        }

        const credentialIdBase64url = body.id;

        // Find the passkey in DB
        const { data: passkey } = await supabaseAdmin
            .from('user_passkeys')
            .select('*')
            .eq('credential_id', credentialIdBase64url)
            .single();

        if (!passkey) {
            return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
        }

        // Find user
        const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('*')
            .eq('id', passkey.user_id)
            .single();

        if (!user || user.active === false) {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 });
        }

        const host = req.headers.get('host');
        const { rpID, expectedOrigin } = getWebAuthnConfig(host);

        // Verify response
        const credential = {
            id: passkey.credential_id, // Base64URL string
            publicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64url')),
            counter: Number(passkey.counter),
            transports: passkey.transports ? (passkey.transports.split(',') as any[]) : undefined,
        };

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            credential,
        });

        if (verification.verified && verification.authenticationInfo) {
            const { newCounter } = verification.authenticationInfo;

            // Update counter to prevent replay
            await updatePasskeyCounter(passkey.credential_id, newCounter);

            // Authentication successful -> Generate JWT just like in /api/auth/login
            const token = generateToken(user, true); // Use true for remember_me by default on passkey

            const response = NextResponse.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                }
            });

            // Set the token cookie
            response.cookies.set('abzToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: '/'
            });

            response.cookies.delete('webauthn_challenge');
            response.cookies.delete('webauthn_user_id');

            return response;
        }

        return NextResponse.json({ error: 'Biometric verification failed' }, { status: 400 });

    } catch (error: any) {
        console.error('Error verifying webauthn login:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
