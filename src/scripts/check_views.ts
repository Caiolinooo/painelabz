
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually since we are running a script
const loadEnv = (filePath: string) => {
    if (fs.existsSync(filePath)) {
        console.log(`Loading env from ${filePath}`);
        const envConfig = fs.readFileSync(filePath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value && !key.startsWith('#')) {
                const cleanKey = key.trim();
                const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[cleanKey]) {
                    process.env[cleanKey] = cleanValue;
                }
            }
        });
    }
};

loadEnv(path.resolve(process.cwd(), '.env'));
loadEnv(path.resolve(process.cwd(), '.env.local'));

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Defined' : 'Missing');

async function checkRecentViews() {
    // Dynamically import to ensure envs are loaded first
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    console.log('Checking recent news_post_views...');
    const { data, error } = await supabaseAdmin
        .from('news_post_views')
        .select('*')
        .order('viewed_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Recent Views:');
    data.forEach((view: any) => {
        console.log(`ID: ${view.id}, PostId: ${view.post_id}, UserId: ${view.user_id}, Date: ${view.viewed_at}`);
    });
}

checkRecentViews();
