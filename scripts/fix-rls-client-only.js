/**
 * Script to fix RLS (Row Level Security) policies for the Reimbursement table
 * This script ONLY uses the Supabase JavaScript client and doesn't attempt to execute SQL directly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in the .env file');
  process.exit(1);
}

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRlsPolicies() {
  try {
    console.log('Starting RLS policy fix for Reimbursement table using Supabase client only...');
    console.log('This script will NOT attempt to execute SQL directly.');
    console.log('Instead, it will check if the table exists and provide instructions for manual fixes.');

    // 1. Check if the Reimbursement table exists
    console.log('Checking if Reimbursement table exists...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('Reimbursement')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking if Reimbursement table exists:', tableError);
      console.log('This might indicate that the table does not exist or RLS policies are already restricting access.');
    } else {
      console.log('Successfully queried the Reimbursement table.');
      console.log('Table exists and is accessible with the current service key.');
    }

    // 2. Try to insert a test record to see if we have write access
    console.log('Trying to insert a test record to check write access...');
    
    const testId = 'test-' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('Reimbursement')
      .insert({
        id: testId,
        nome: 'Test User',
        email: 'test@example.com',
        telefone: '123456789',
        cpf: '12345678901',
        cargo: 'Test',
        centro_custo: 'Test',
        data: new Date().toISOString(),
        tipo_reembolso: 'Test',
        descricao: 'Test',
        valor_total: 0,
        moeda: 'BRL',
        metodo_pagamento: 'Test',
        comprovantes: [],
        protocolo: 'TEST-' + Date.now(),
        historico: []
      })
      .select();
    
    if (insertError) {
      console.error('Error inserting test record:', insertError);
      console.log('This might indicate that RLS policies are already restricting access.');
    } else {
      console.log('Successfully inserted a test record.');
      console.log('This indicates that the table is writable with the current service key.');
      
      // Clean up the test record
      console.log('Cleaning up the test record...');
      
      const { error: deleteError } = await supabase
        .from('Reimbursement')
        .delete()
        .eq('id', testId);
      
      if (deleteError) {
        console.error('Error deleting test record:', deleteError);
      } else {
        console.log('Successfully deleted the test record.');
      }
    }

    // 3. Try to read all records to see if we have read access
    console.log('Trying to read all records to check read access...');
    
    const { data: readData, error: readError } = await supabase
      .from('Reimbursement')
      .select('*')
      .limit(10);
    
    if (readError) {
      console.error('Error reading records:', readError);
      console.log('This might indicate that RLS policies are already restricting access.');
    } else {
      console.log(`Successfully read ${readData?.length || 0} records.`);
      console.log('This indicates that the table is readable with the current service key.');
    }

    // 4. Provide instructions for manual fixes
    console.log('\n=== MANUAL FIX INSTRUCTIONS ===');
    console.log('Since we cannot execute SQL directly, you will need to manually fix the RLS policies.');
    console.log('Please follow these steps:');
    console.log('1. Log in to the Supabase dashboard at https://app.supabase.io');
    console.log('2. Select your project');
    console.log('3. Navigate to the "Table Editor" section');
    console.log('4. Select the "Reimbursement" table');
    console.log('5. Click on the "Policies" tab');
    console.log('6. Enable RLS by clicking the toggle switch if it\'s not already enabled');
    console.log('7. Click on "New Policy"');
    console.log('8. Create the following policies:');
    console.log('\n=== Policy 1: Select Policy ===');
    console.log('- Policy Name: "Reimbursement Select Policy"');
    console.log('- Operation: SELECT');
    console.log('- Using expression: true');
    console.log('\n=== Policy 2: Insert Policy ===');
    console.log('- Policy Name: "Reimbursement Insert Policy"');
    console.log('- Operation: INSERT');
    console.log('- Using expression: true');
    console.log('\n=== Policy 3: Update Policy ===');
    console.log('- Policy Name: "Reimbursement Update Policy"');
    console.log('- Operation: UPDATE');
    console.log('- Using expression: true');
    console.log('\n=== IMPORTANT NOTES ===');
    console.log('- These simplified policies allow all authenticated users to perform all operations.');
    console.log('- This is a temporary solution to get the application working.');
    console.log('- You should refine these policies later to implement proper access control.');
    console.log('- For more information, see the docs/FIXING-RLS-POLICIES.md file.');

    return true;
  } catch (error) {
    console.error('Exception fixing RLS policies:', error);
    return false;
  }
}

// Run the function
fixRlsPolicies()
  .then(success => {
    if (success) {
      console.log('\nRLS policy check completed. Please follow the manual instructions above.');
      process.exit(0);
    } else {
      console.error('\nFailed to complete RLS policy check.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
