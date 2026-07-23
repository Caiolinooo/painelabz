import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim();
        }
    });
}

import { getSupabaseAdmin } from '../src/lib/supabase';

async function run() {
    const supabase = await getSupabaseAdmin();
    const email = 'brunostigo@gmail.com';
    
    console.log("Querying by email:", email);
    const { data: byEmail, error: errEmail } = await supabase
        .from('users_unified')
        .select('*')
        .eq('email', email);
    console.log("byEmail result:", byEmail, "Error:", errEmail);

    console.log("Querying all users to see if email exists in different casing/spacing:");
    const { data: allUsers, error: errAll } = await supabase
        .from('users_unified')
        .select('id, email, tax_id');
    
    if (allUsers) {
        const matches = allUsers.filter(u => u.email && u.email.toLowerCase().includes('bruno'));
        console.log("Bruno matches in DB:", matches);
    } else {
        console.log("Failed to list users:", errAll);
    }
}

run();
