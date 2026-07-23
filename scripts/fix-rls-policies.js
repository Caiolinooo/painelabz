/**
 * Script to fix RLS (Row Level Security) policies for the Reimbursement table
 * This script directly applies the policies using the Supabase REST API
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in the .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to execute SQL directly
async function executeSql(sql) {
  try {
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error(`Error executing SQL: ${errorText}`);
      return { success: false, error: errorText };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.log('No JSON response (this is normal for some operations)');
      data = null;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception executing SQL:', error);
    return { success: false, error: String(error) };
  }
}

async function fixRlsPolicies() {
  try {
    console.log('Fixing RLS policies for Reimbursement table...');

    // First check if the Reimbursement table exists
    console.log('Checking if Reimbursement table exists...');
    
    const checkTableSQL = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Reimbursement'
      ) as table_exists;
    `;
    
    const tableCheckResult = await executeSql(checkTableSQL);
    
    if (!tableCheckResult.success || !tableCheckResult.data || !tableCheckResult.data[0] || !tableCheckResult.data[0].table_exists) {
      console.error('Reimbursement table does not exist. Please create it first.');
      return false;
    }
    
    console.log('Reimbursement table exists. Proceeding with RLS policy updates...');

    // Drop existing policies first to avoid conflicts
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Reimbursement Access Policy" ON "Reimbursement";
      DROP POLICY IF EXISTS "Reimbursement Insert Policy" ON "Reimbursement";
      DROP POLICY IF EXISTS "Reimbursement Select Policy" ON "Reimbursement";
      DROP POLICY IF EXISTS "Reimbursement Update Policy" ON "Reimbursement";
    `;
    
    console.log('Dropping existing RLS policies...');
    
    // Try dropping each policy separately
    const dropStatements = dropPoliciesSQL.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of dropStatements) {
      try {
        const dropResult = await executeSql(statement + ';');
        if (dropResult.success) {
          console.log(`Successfully executed: ${statement}`);
        } else {
          console.log(`Failed to execute: ${statement} - This is expected if the policy doesn't exist`);
        }
      } catch (error) {
        console.log(`Exception executing: ${statement} - This is expected if the policy doesn't exist`);
      }
    }
    
    // Create new policies with proper permissions
    const createPoliciesSQL = `
      -- Policy for SELECT: Allow users to see their own reimbursements, admins and managers see all
      CREATE POLICY "Reimbursement Select Policy" 
      ON "Reimbursement"
      FOR SELECT
      USING (
        email = auth.email() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'MANAGER')
        ) OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND access_permissions->'features'->>'reimbursement_approval' = 'true'
        )
      );

      -- Policy for INSERT: Allow authenticated users to insert their own reimbursements
      CREATE POLICY "Reimbursement Insert Policy" 
      ON "Reimbursement"
      FOR INSERT
      WITH CHECK (
        email = auth.email() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'MANAGER')
        )
      );

      -- Policy for UPDATE: Allow admins, managers, and users with approval permission to update any reimbursement
      -- Regular users can only update their own reimbursements
      CREATE POLICY "Reimbursement Update Policy" 
      ON "Reimbursement"
      FOR UPDATE
      USING (
        email = auth.email() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'MANAGER')
        ) OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND access_permissions->'features'->>'reimbursement_approval' = 'true'
        )
      );
    `;
    
    console.log('Creating new RLS policies...');
    
    // Try creating each policy separately
    const createStatements = createPoliciesSQL.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    let allSucceeded = true;
    
    for (const statement of createStatements) {
      try {
        const createResult = await executeSql(statement + ';');
        if (createResult.success) {
          console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`Failed to execute: ${statement.substring(0, 50)}...`);
          allSucceeded = false;
        }
      } catch (error) {
        console.error(`Exception executing: ${statement.substring(0, 50)}...`, error);
        allSucceeded = false;
      }
    }
    
    // Enable RLS on the Reimbursement table
    const enableRlsSQL = `
      ALTER TABLE "Reimbursement" ENABLE ROW LEVEL SECURITY;
    `;
    
    console.log('Enabling RLS on Reimbursement table...');
    
    const enableRlsResult = await executeSql(enableRlsSQL);
    
    if (enableRlsResult.success) {
      console.log('Successfully enabled RLS on Reimbursement table');
    } else {
      console.error('Failed to enable RLS on Reimbursement table');
      allSucceeded = false;
    }
    
    return allSucceeded;
  } catch (error) {
    console.error('Exception fixing RLS policies:', error);
    return false;
  }
}

// Run the function
fixRlsPolicies()
  .then(success => {
    if (success) {
      console.log('RLS policies fixed successfully.');
      process.exit(0);
    } else {
      console.error('Failed to fix RLS policies completely.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
