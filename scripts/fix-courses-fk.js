require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('Missing DATABASE_URL in .env.local');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();

        // 1. Add instructor column to academy_courses
        console.log('Adding "instructor" column to academy_courses...');
        await client.query(`ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS instructor VARCHAR(255);`);
        console.log('Column "instructor" added successfully.');

        // 2. Check foreign key relationship for academy_enrollments to profiles
        console.log('Checking foreign keys for academy_enrollments...');
        const fkRes = await client.query(`
      SELECT
          tc.table_schema, 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='academy_enrollments';
    `);

        console.log('Current FKs on academy_enrollments:');
        fkRes.rows.forEach(r => console.log(`- ${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`));

        // In Supabase, the user table is either auth.users or public.users_unified or public.profiles
        // We need to see if academy_enrollments has a user_id FK to profiles. If not, add it or adjust the API.
        // However, the error is: Could not find a relationship between 'academy_enrollments' and 'profiles' in the schema cache
        // Let's add a foreign key to profiles if profiles exists.

        const profilesRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
      );
    `);

        if (profilesRes.rows[0].exists) {
            console.log('Adding foreign key to profiles on academy_enrollments...');
            try {
                await client.query(`
                ALTER TABLE academy_enrollments
                ADD CONSTRAINT fk_academy_enrollments_profiles
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            `);
                console.log('FK to profiles added successfully.');
            } catch (e) {
                console.log('FK may already exist or conflict:', e.message);
            }
        } else {
            console.log('Table profiles DOES NOT EXIST. The error indicates PostgREST is trying to join with profiles, maybe the API query requests a join like `profiles(*)`');
        }

        console.log('Reloading PostgREST schema cache...');
        await client.query('NOTIFY pgrst, \\\'reload schema\\\''.replace(/\\\'/g, "'"));
        console.log('Schema cache reloaded.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
