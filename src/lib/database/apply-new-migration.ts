import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
    const migrationFile = 'create-site-config-table.sql';
    const migrationsDir = path.join(process.cwd(), 'src/lib/database/migrations');
    const migracaoPath = path.join(migrationsDir, migrationFile);

    try {
        console.log(`Reading migration file: ${migracaoPath}`);
        const sql = fs.readFileSync(migracaoPath, 'utf8');

        console.log('Applying migration...');
        // Using rpc 'exec_sql' as seen in apply-migrations.ts, assuming it exists
        // If not, we might need another way or assuming the user has permissions to run raw sql via rpc
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error applying migration:', error);
            // Fallback: try direct SQL execution if possible (usually not possible with supabase-js client unless service role)
            // But since apply-migrations.ts uses this, it likely works.
        } else {
            console.log('Migration applied successfully!');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

applyMigration();
