import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getWebAuthnConfig, saveChallenge, getUserPasskeys } from '@/lib/webauthn';
import { supabaseAdmin } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = body.email;

        let userId = null;
        let allowCredentials = undefined;

        // If email is provided, we can look up the user and their expected passkeys
        if (email) {
            const { data: user } = await supabaseAdmin
                .from('users_unified')
                .select('id')
                .eq('email', email)
                .single();

            if (user) {
                userId = user.id;
                const passkeys = await getUserPasskeys(userId);
                if (passkeys.length > 0) {
                    allowCredentials = passkeys.map(key => ({
                        id: key.credential_id,
                        type: 'public-key',
                        transports: key.transports ? key.transports.split(',') : ['internal'],
                    }));
                }
            }
        }

        // If no user identified yet (discoverable credentials flow),
        // we use a temporary random UUID just to store the challenge in a generic 'sessions' table or similar.
        // But since our `webauthn_challenge` is attached to `users_unified`, we need to handle anonymous challenges differently.
        // For simplicity, we can require the email first in our UX, or we can use cookies for the challenge.
        // Let's use a secure HttpOnly cookie for the challenge instead of the DB, as it's cleaner for anonymous login flows.

        const host = req.headers.get('host');
        const { rpID } = getWebAuthnConfig(host);

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            userVerification: 'preferred',
        });

        // Store challenge in a cookie since it's an unauthenticated flow
        const response = NextResponse.json(options);

        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300 // 5 minutes
        });

        // Also if we know the userId, store it in a cookie to help verify it later
        if (userId) {
            response.cookies.set('webauthn_user_id', userId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 300
            });
        }

        return response;

    } catch (error: any) {
        console.error('Error generating webauthn login options:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
