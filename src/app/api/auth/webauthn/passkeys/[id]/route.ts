import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
        const passkeyId = params.id;

        const { error } = await supabaseAdmin
            .from('user_passkeys')
            .delete()
            .eq('id', passkeyId)
            .eq('user_id', userId);

        if (error) {
            console.error('Database Error:', error);
            throw error;
        }

        return NextResponse.json({ success: true, message: 'Removido com sucesso' });
    } catch (error: any) {
        console.error('Error deleting passkey:', error);
        return NextResponse.json({ error: 'Erro ao remover biometria' }, { status: 500 });
    }
}
