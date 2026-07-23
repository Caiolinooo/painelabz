const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://arzvingdtnttiejcvucs.supabase.co';
const SERVICE_KEY = 'REDACTED_SUPABASE_JWT_ROTATE_ME';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running Poliweb credentials table migration...\n');

  // Step 1: Create the table using raw SQL via the Supabase Management API
  // Since the REST API doesn't support raw SQL execution, we'll use a workaround
  // by inserting a test record to verify the table exists, or create it via the management API
  
  // First, let's check if we can access the database
  console.log('Step 1: Testing database connection...');
  const { data: testUsers, error: testError } = await supabase
    .from('users_unified')
    .select('id, email, first_name, last_name')
    .limit(3);
  
  if (testError) {
    console.error('❌ Database connection error:', testError.message);
    console.log('\n⚠️  You will need to run the migration manually in Supabase Dashboard:');
    console.log('   1. Go to: https://arzvingdtnttiejcvucs.supabase.co/project/_/sql');
    console.log('   2. Copy the contents of: supabase/migrations/20260401_create_poliweb_credentials.sql');
    console.log('   3. Run the SQL\n');
    return;
  }
  
  console.log('✅ Database connection successful!');
  console.log('Found users:', testUsers?.map(u => u.email).join(', '));

  // Step 2: Find Hudna and Admin users
  console.log('\nStep 2: Finding users for test credentials...');
  
  const { data: hudnaUser, error: hudnaError } = await supabase
    .from('users_unified')
    .select('id, email, first_name, last_name')
    .ilike('email', '%hudna%')
    .single();
  
  if (hudnaError) {
    console.log('⚠️  Hudna user not found. Searching by exact email...');
    const { data: hudnaExact, error: hudnaExactError } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name')
      .eq('email', 'hudna.mendonca@groupabz.com')
      .single();
    
    if (hudnaExactError) {
      console.log('❌ Could not find Hudna user. Please verify the email exists in the system.');
    } else {
      console.log('✅ Found Hudna:', hudnaExact.email, '(ID:', hudnaExact.id + ')');
    }
  } else {
    console.log('✅ Found Hudna:', hudnaUser.email, '(ID:', hudnaUser.id + ')');
  }

  // Find admin user
  const { data: adminUsers, error: adminError } = await supabase
    .from('users_unified')
    .select('id, email, first_name, last_name, role')
    .eq('role', 'ADMIN')
    .limit(5);
  
  if (adminError) {
    console.log('⚠️  Error finding admin users:', adminError.message);
  } else if (adminUsers && adminUsers.length > 0) {
    console.log('\n✅ Found admin users:');
    adminUsers.forEach(u => {
      console.log(`   - ${u.first_name} ${u.last_name} (${u.email}) [ID: ${u.id}]`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\nThe poliweb_credentials table needs to be created in Supabase.');
  console.log('\nOption 1: Via Supabase Dashboard (Recommended)');
  console.log('   1. Go to: https://arzvingdtnttiejcvucs.supabase.co');
  console.log('   2. Navigate to SQL Editor');
  console.log('   3. Copy and paste the contents of:');
  console.log('      supabase/migrations/20260401_create_poliweb_credentials.sql');
  console.log('   4. Click "Run"');
  
  console.log('\nOption 2: Via Supabase CLI');
  console.log('   npx supabase db push');
  
  console.log('\n' + '='.repeat(60));
  
  // Step 3: Instructions for adding test credentials
  console.log('\nAFTER MIGRATION - Add Test Credentials:');
  console.log('='.repeat(60));
  console.log('\nRun this SQL in Supabase Dashboard SQL Editor:');
  console.log('\n-- Replace USER_ID_HUDNA with Hudna\'s actual user ID');
  console.log('-- Replace USER_ID_ADMIN with your actual user ID');
  console.log(`
INSERT INTO poliweb_credentials (user_id, username, password)
VALUES 
  ('USER_ID_HUDNA', 'hudna.mendonca@groupabz.com', 'Clave#123'),
  ('USER_ID_ADMIN', 'admin@email.com', 'admin_password')
ON CONFLICT (user_id) DO UPDATE 
SET username = EXCLUDED.username, 
    password = EXCLUDED.password,
    updated_at = NOW();
  `);
}

runMigration().catch(console.error);
