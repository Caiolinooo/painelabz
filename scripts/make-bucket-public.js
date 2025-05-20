/**
 * Script to make the comprovantes bucket public as a temporary solution
 * This bypasses RLS policies by making the bucket publicly accessible
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

async function makeBucketPublic() {
  try {
    console.log('Starting process to make comprovantes bucket public...');

    // 1. Check if the comprovantes bucket exists
    console.log('Checking if comprovantes bucket exists...');
    
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const comprovantesBucket = buckets.find(bucket => bucket.name === 'comprovantes');
    
    if (!comprovantesBucket) {
      console.log('Comprovantes bucket does not exist, creating it as public...');
      
      // Create the comprovantes bucket as public
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket('comprovantes', {
          public: true, // Make it public
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });
      
      if (createError) {
        console.error('Error creating comprovantes bucket:', createError);
        
        // Try SQL approach
        console.log('Trying SQL approach to create public bucket...');
        
        try {
          // Use the SQL API to create the bucket
          const { data, error } = await supabase.rpc('execute_sql', {
            sql_query: `
              INSERT INTO storage.buckets (id, name, public)
              VALUES ('comprovantes', 'comprovantes', true)
              ON CONFLICT (id) DO UPDATE SET public = true;
            `
          });
          
          if (error) {
            console.error('Error executing SQL to create bucket:', error);
            return false;
          }
          
          console.log('Successfully created/updated bucket using SQL');
        } catch (sqlError) {
          console.error('Exception executing SQL:', sqlError);
          return false;
        }
      } else {
        console.log('Comprovantes bucket created successfully as public');
      }
    } else {
      console.log('Comprovantes bucket already exists, updating to make it public...');
      
      // Update the bucket to make it public
      const { data: updateData, error: updateError } = await supabase
        .storage
        .updateBucket('comprovantes', {
          public: true // Make it public
        });
      
      if (updateError) {
        console.error('Error updating comprovantes bucket:', updateError);
        
        // Try SQL approach
        console.log('Trying SQL approach to make bucket public...');
        
        try {
          // Use the SQL API to update the bucket
          const { data, error } = await supabase.rpc('execute_sql', {
            sql_query: `
              UPDATE storage.buckets
              SET public = true
              WHERE id = 'comprovantes';
            `
          });
          
          if (error) {
            console.error('Error executing SQL to update bucket:', error);
            return false;
          }
          
          console.log('Successfully updated bucket using SQL');
        } catch (sqlError) {
          console.error('Exception executing SQL:', sqlError);
          return false;
        }
      } else {
        console.log('Comprovantes bucket updated successfully to be public');
      }
    }

    // 3. Try to upload a test file to check if we have write access
    console.log('\nTrying to upload a test file to check write access...');
    
    const testFileContent = 'This is a test file to check write access to the comprovantes bucket.';
    const testFilePath = 'test-' + Date.now() + '.pdf'; // Use PDF extension to match allowed MIME types
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('comprovantes')
      .upload(testFilePath, Buffer.from(testFileContent), {
        contentType: 'application/pdf' // Use PDF MIME type
      });
    
    if (uploadError) {
      console.error('Error uploading test file:', uploadError);
      console.log('Making the bucket public did not resolve the issue.');
      console.log('Please follow the manual instructions to configure RLS policies.');
    } else {
      console.log('Test file uploaded successfully!');
      console.log('The bucket is now public and files can be uploaded.');
      
      // Clean up the test file
      console.log('Cleaning up the test file...');
      
      const { error: deleteError } = await supabase
        .storage
        .from('comprovantes')
        .remove([testFilePath]);
      
      if (deleteError) {
        console.error('Error deleting test file:', deleteError);
      } else {
        console.log('Test file deleted successfully');
      }
    }

    console.log('\n=== IMPORTANT SECURITY NOTE ===');
    console.log('The comprovantes bucket has been made public as a temporary solution.');
    console.log('This means that anyone can access the files in this bucket without authentication.');
    console.log('For a production environment, you should configure proper RLS policies instead.');
    console.log('Please refer to the docs/FIXING-STORAGE-RLS-POLICIES.md file for instructions on how to configure RLS policies.');

    return true;
  } catch (error) {
    console.error('Exception making bucket public:', error);
    return false;
  }
}

// Run the function
makeBucketPublic()
  .then(success => {
    if (success) {
      console.log('\nProcess completed. The comprovantes bucket should now be public.');
      process.exit(0);
    } else {
      console.error('\nFailed to make the comprovantes bucket public.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
