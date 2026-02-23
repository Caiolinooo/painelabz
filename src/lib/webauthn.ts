import { supabaseAdmin } from './db';

const rpName = 'ABZ Group';

export function getWebAuthnConfig(requestHost?: string | null) {
    // Definimos o RP ID como o hostname da requisição sem a porta, se tiver
    let rpID = 'localhost';
    let expectedOrigin = 'http://localhost:3000';

    if (requestHost) {
        if (requestHost.includes('localhost') || requestHost.includes('127.0.0.1')) {
            rpID = requestHost.split(':')[0];
            expectedOrigin = `http://${requestHost}`;
        } else {
            rpID = requestHost.split(':')[0];
            expectedOrigin = `https://${requestHost}`;
        }
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        try {
            const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
            rpID = url.hostname;
            expectedOrigin = url.origin;
        } catch (e) {
            // ignore
        }
    }

    return {
        rpName,
        rpID,
        expectedOrigin
    };
}

export async function getUserPasskeys(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('user_passkeys')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user passkeys:', error);
        return [];
    }

    return data || [];
}

export async function saveUserPasskey(passkey: any) {
    const { error } = await supabaseAdmin
        .from('user_passkeys')
        .insert([
            {
                user_id: passkey.user_id,
                credential_id: passkey.credential_id,
                public_key: passkey.public_key,
                counter: passkey.counter,
                device_type: passkey.device_type,
                backed_up: passkey.backed_up,
                transports: passkey.transports
            }
        ]);

    if (error) {
        console.error('Error saving user passkey:', error);
        throw error;
    }
}

export async function updatePasskeyCounter(credentialId: string, newCounter: number) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
        .from('user_passkeys')
        .update({ counter: newCounter, last_used_at: now })
        .eq('credential_id', credentialId);

    if (error) {
        console.error('Error updating passkey counter:', error);
    }
}

export async function saveChallenge(userId: string, challenge: string) {
    const { error } = await supabaseAdmin
        .from('users_unified')
        .update({ webauthn_challenge: challenge })
        .eq('id', userId);

    if (error) {
        console.error('Error saving challenge:', error);
        throw error;
    }
}

export async function getAndClearChallenge(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('webauthn_challenge')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    // Clear challenge
    await supabaseAdmin
        .from('users_unified')
        .update({ webauthn_challenge: null })
        .eq('id', userId);

    return data.webauthn_challenge;
}
