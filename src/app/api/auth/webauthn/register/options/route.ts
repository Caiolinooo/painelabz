import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
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
        const { rpName, rpID } = getWebAuthnConfig(host);

        // Get existing user passkeys to exclude them
        const existingPasskeys = await getUserPasskeys(userId);

        // Parse body mapping attachment preferences
        let attachment: 'platform' | 'cross-platform' | undefined;
        try {
            const body = await req.json();
            if (body.attachment === 'platform' || body.attachment === 'cross-platform') {
                attachment = body.attachment;
            }
        } catch (e) {
            // No body or invalid json
        }

        const authenticatorSelection: any = {
            residentKey: 'required',
            userVerification: 'preferred',
        };

        if (attachment) {
            authenticatorSelection.authenticatorAttachment = attachment;
        }

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(userId)),
            userName: user.email || user.phone_number || userId,
            userDisplayName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário ABZ',
            // Allow multiple authenticators, exclude existing
            excludeCredentials: existingPasskeys.map(key => ({
                id: key.credential_id,
                type: 'public-key',
                transports: key.transports ? key.transports.split(',') : ['internal'],
            })),
            authenticatorSelection
        });

        // Store challenge
        await saveChallenge(userId, options.challenge);

        return NextResponse.json(options);

    } catch (error: any) {
        console.error('Error generating webauthn register options:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
