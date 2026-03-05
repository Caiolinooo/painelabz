import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`) {
            // In development, allow without token for easy setup
            if (process.env.NODE_ENV !== 'development') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { searchParams } = new URL(request.url);
        const execute = searchParams.get('execute') === 'true';

        if (!execute) {
            return NextResponse.json({
                message: 'This endpoint will create the Academy Quizzes tables. Use ?execute=true to run.'
            });
        }

        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260302_create_academy_quizzes.sql');

        if (!fs.existsSync(sqlPath)) {
            return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Remove comments to prevent issues with the RPC parser
        const cleanedSql = sqlContent
            .replace(/--.*$/gm, '')
            .split(';')
            .filter(cmd => cmd.trim().length > 0)
            .join(';');

        // Try executing through RPC first
        const { error: rpcError } = await supabaseAdmin.rpc('execute_sql', { sql: cleanedSql });

        if (rpcError) {
            console.error('RPC Error, but continuing (migrations often fail silently on already existing tables):', rpcError);
            // Return success anyway as it usually means tables exist or RPC is missing, user can run manually
            return NextResponse.json({
                message: 'Migration execution attempted. If it failed, please run the SQL directly in the Supabase Dashboard SQL Editor.',
                file: '20260302_create_academy_quizzes.sql',
                error: rpcError.message
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Academy Quizzes tables created successfully!'
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
