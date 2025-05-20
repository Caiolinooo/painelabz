/**
 * Script to create the execute_sql function in Supabase
 * This function is needed for various operations in the application
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

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecuteSqlFunction() {
  try {
    console.log('Creating execute_sql function in Supabase...');

    // SQL to create the execute_sql function
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // First check if the function already exists
    console.log('Checking if execute_sql function already exists...');
    
    // Try to call the function to see if it exists
    const { error: checkError } = await supabase.rpc('execute_sql', { 
      sql: 'SELECT 1;' 
    });

    if (!checkError) {
      console.log('execute_sql function already exists.');
      return true;
    }

    console.log('execute_sql function does not exist or has an error. Creating it...');

    // Try to create the function using exec_sql if it exists
    const { error: execError } = await supabase.rpc('exec_sql', { 
      sql: createFunctionSQL 
    });

    if (!execError) {
      console.log('execute_sql function created successfully using exec_sql.');
      return true;
    }

    console.log('exec_sql function not available. Trying direct SQL execution...');

    // If exec_sql is not available, try direct SQL execution
    try {
      // Use the REST API to execute SQL directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          sql: createFunctionSQL
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating execute_sql function via REST API:', errorText);
        
        // Try one more approach - using auth.admin.executeRaw
        console.log('Trying to create function using auth.admin.executeRaw...');
        await supabase.auth.admin.executeRaw(createFunctionSQL);
        console.log('execute_sql function created successfully using auth.admin.executeRaw.');
        return true;
      }

      console.log('execute_sql function created successfully via REST API.');
      return true;
    } catch (directError) {
      console.error('Error creating execute_sql function:', directError);
      
      console.log('All attempts to create execute_sql function failed.');
      console.log('Please run the following SQL in the Supabase dashboard SQL editor:');
      console.log(createFunctionSQL);
      
      return false;
    }
  } catch (error) {
    console.error('Exception creating execute_sql function:', error);
    return false;
  }
}

// Run the function
createExecuteSqlFunction()
  .then(success => {
    if (success) {
      console.log('execute_sql function setup completed successfully.');
      process.exit(0);
    } else {
      console.error('Failed to set up execute_sql function.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
