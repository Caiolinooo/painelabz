import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

// POST - Registrar atividade do usuário (Heartbeat)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });

        try {
            const now = new Date().toISOString();
            // Upsert na tabela user_activity usando Postgres Nativo
            await pool.query(
                `INSERT INTO "user_activity" (user_id, last_active_at, updated_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id)
                 DO UPDATE SET 
                    last_active_at = EXCLUDED.last_active_at,
                    updated_at = EXCLUDED.updated_at`,
                [userId, now, now]
            );
            await pool.end();
        } catch (error) {
            console.error('Erro ao registrar heartbeart de atividade no PostgreSQL:', error);
            try { await pool.end(); } catch {}
            // Não falhar request, tracking é secundário
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // console.error('Erro tracker:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
