import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { getWebAuthnConfig, saveChallenge, getUserPasskeys } from '@/lib/webauthn';
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

        // Fetch User Info
        const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('email, phone_number, first_name, last_name')
            .eq('id', userId)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get WebAuthn RP Configuration
        const host = req.headers.get('host');
        const { rpID } = getWebAuthnConfig(host);

        // Get existing user passkeys to allow only registered ones
        const existingPasskeys = await getUserPasskeys(userId);

        if (existingPasskeys.length === 0) {
            return NextResponse.json({ error: 'Nenhuma biometria cadastrada neste usuário.' }, { status: 400 });
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: existingPasskeys.map(key => ({
                id: key.credential_id,
                type: 'public-key',
                transports: key.transports ? key.transports.split(',') : ['internal'],
            })),
            userVerification: 'required', // for signing, we want strong verification
        });

        // Store challenge
        await saveChallenge(userId, options.challenge);

        return NextResponse.json(options);

    } catch (error: any) {
        console.error('Error generating webauthn sign options:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
