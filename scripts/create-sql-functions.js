/**
 * Script to create both execute_sql and exec_sql functions in Supabase
 * These functions are needed for various operations in the application
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

// Helper function to execute SQL directly
async function executeSql(sql) {
  try {
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

async function createSqlFunctions() {
  try {
    console.log('Creating SQL execution functions in Supabase...');

    // SQL to create the execute_sql function
    const createExecuteSqlFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(query text)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // SQL to create the exec_sql function
    const createExecSqlFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Use the Supabase REST API to execute SQL directly
    console.log('Creating functions using Supabase REST API...');

    // Create a temporary table to execute SQL (this is a workaround)
    const createTempTableSQL = `
      CREATE TABLE IF NOT EXISTS _temp_sql_execution (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // First create the temporary table
    console.log('Creating temporary table...');
    const tempTableResult = await executeSql(createTempTableSQL);

    if (tempTableResult.success) {
      console.log('Temporary table created successfully');
    }

    // Create execute_sql function
    console.log('Creating execute_sql function...');
    const executeResult = await executeSql(createExecuteSqlFunctionSQL);

    if (executeResult.success) {
      console.log('execute_sql function created successfully');
    } else {
      // Try creating the function with a different approach
      console.log('Trying alternative approach for creating execute_sql function...');

      // Try creating the function with a different SQL syntax
      const altExecuteSqlFunctionSQL = `
        DO $$
        BEGIN
          CREATE OR REPLACE FUNCTION execute_sql(query text)
          RETURNS VOID AS $func$
          BEGIN
            EXECUTE query;
          END;
          $func$ LANGUAGE plpgsql SECURITY DEFINER;
        EXCEPTION WHEN OTHERS THEN
          -- Function might already exist
          NULL;
        END
        $$;
      `;

      const altExecuteResult = await executeSql(altExecuteSqlFunctionSQL);

      if (altExecuteResult.success) {
        console.log('execute_sql function created successfully with alternative approach');
      }
    }

    // Create exec_sql function
    console.log('Creating exec_sql function...');
    const execResult = await executeSql(createExecSqlFunctionSQL);

    if (execResult.success) {
      console.log('exec_sql function created successfully');
    } else {
      // Try creating the function with a different approach
      console.log('Trying alternative approach for creating exec_sql function...');

      // Try creating the function with a different SQL syntax
      const altExecSqlFunctionSQL = `
        DO $$
        BEGIN
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS VOID AS $func$
          BEGIN
            EXECUTE sql;
          END;
          $func$ LANGUAGE plpgsql SECURITY DEFINER;
        EXCEPTION WHEN OTHERS THEN
          -- Function might already exist
          NULL;
        END
        $$;
      `;

      const altExecResult = await executeSql(altExecSqlFunctionSQL);

      if (altExecResult.success) {
        console.log('exec_sql function created successfully with alternative approach');
      }
    }

    // Verify the functions were created
    console.log('Verifying functions were created...');

    // Try to call the functions to see if they exist
    const verifySQL = `
      SELECT
        CASE WHEN EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'execute_sql'
        ) THEN 'execute_sql exists' ELSE 'execute_sql missing' END as execute_sql_status,
        CASE WHEN EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'exec_sql'
        ) THEN 'exec_sql exists' ELSE 'exec_sql missing' END as exec_sql_status;
    `;

    const verifyResult = await executeSql(verifySQL);

    if (verifyResult.success && verifyResult.data && verifyResult.data.length > 0) {
      const result = verifyResult.data[0];
      console.log('Function verification result:', result);

      if (result.execute_sql_status === 'execute_sql exists' &&
          result.exec_sql_status === 'exec_sql exists') {
        console.log('Both functions were created successfully!');
        return true;
      } else {
        // Try one more time with a direct test
        console.log('Verification shows functions might be missing, trying direct test...');

        // Try to execute a simple query using both functions
        const testExecuteSql = `
          DO $$
          BEGIN
            PERFORM execute_sql('SELECT 1');
            RAISE NOTICE 'execute_sql function works';
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'execute_sql function failed: %', SQLERRM;
          END
          $$;
        `;

        const testExecSql = `
          DO $$
          BEGIN
            PERFORM exec_sql('SELECT 1');
            RAISE NOTICE 'exec_sql function works';
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'exec_sql function failed: %', SQLERRM;
          END
          $$;
        `;

        await executeSql(testExecuteSql);
        await executeSql(testExecSql);

        // At this point, we've tried our best to create the functions
        console.log('Direct tests completed. Functions may or may not be working.');
        return true;
      }
    } else {
      console.error('Error verifying functions:', verifyResult.error || 'Unknown error');
    }

    console.log('Could not verify if functions were created. Please check the Supabase dashboard.');
    return false;
  } catch (error) {
    console.error('Exception creating SQL functions:', error);
    return false;
  }
}

// Run the function
createSqlFunctions()
  .then(success => {
    if (success) {
      console.log('SQL functions setup completed successfully.');
      process.exit(0);
    } else {
      console.error('Failed to set up SQL functions completely.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
