/**
 * Script to fix RLS (Row Level Security) policies for the storage buckets
 * This script uses the Supabase JavaScript client directly
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

async function fixStorageRLS() {
  try {
    console.log('Starting storage RLS policy fix...');

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
      console.log('Comprovantes bucket does not exist, creating it...');

      // Create the comprovantes bucket
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket('comprovantes', {
          public: false,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });

      if (createError) {
        console.error('Error creating comprovantes bucket:', createError);
        console.log('This might indicate that RLS policies are already restricting access');
      } else {
        console.log('Comprovantes bucket created successfully');
      }
    } else {
      console.log('Comprovantes bucket already exists');
    }

    // 2. Provide instructions for manually fixing storage RLS policies
    console.log('\n=== MANUAL FIX INSTRUCTIONS FOR STORAGE RLS POLICIES ===');
    console.log('Please follow these steps to fix the storage RLS policies:');
    console.log('1. Log in to the Supabase dashboard at https://app.supabase.io');
    console.log('2. Select your project');
    console.log('3. Navigate to the "Storage" section');
    console.log('4. Click on the "Policies" tab');
    console.log('5. For the "comprovantes" bucket, create the following policies:');
    console.log('\n=== Policy 1: Allow all authenticated users to read files ===');
    console.log('- Policy Name: "Allow all authenticated users to read files"');
    console.log('- Allowed operation: SELECT');
    console.log('- Definition: (auth.role() = \'authenticated\')');
    console.log('\n=== Policy 2: Allow all authenticated users to insert files ===');
    console.log('- Policy Name: "Allow all authenticated users to insert files"');
    console.log('- Allowed operation: INSERT');
    console.log('- Definition: (auth.role() = \'authenticated\')');
    console.log('\n=== Policy 3: Allow all authenticated users to update files ===');
    console.log('- Policy Name: "Allow all authenticated users to update files"');
    console.log('- Allowed operation: UPDATE');
    console.log('- Definition: (auth.role() = \'authenticated\')');
    console.log('\n=== Policy 4: Allow all authenticated users to delete files ===');
    console.log('- Policy Name: "Allow all authenticated users to delete files"');
    console.log('- Allowed operation: DELETE');
    console.log('- Definition: (auth.role() = \'authenticated\')');
    console.log('\n=== ALTERNATIVE: SQL METHOD ===');
    console.log('If you prefer to use SQL, you can run the following SQL in the Supabase SQL Editor:');
    console.log(`
-- Create the comprovantes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow all authenticated users to read files
CREATE POLICY "Allow all authenticated users to read files"
ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to insert files
CREATE POLICY "Allow all authenticated users to insert files"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to update files
CREATE POLICY "Allow all authenticated users to update files"
ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to delete files
CREATE POLICY "Allow all authenticated users to delete files"
ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);
`);

    console.log('\n=== IMPORTANT NOTES ===');
    console.log('- These simplified policies allow all authenticated users to perform all operations on the storage bucket.');
    console.log('- This is a temporary solution to get the application working.');
    console.log('- You should refine these policies later to implement proper access control.');

    // 3. Try to create a test file to check if we have write access
    console.log('\nTrying to create a test file to check write access...');

    const testFileContent = 'This is a test file to check write access to the comprovantes bucket.';
    const testFilePath = 'test-' + Date.now() + '.txt';

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('comprovantes')
      .upload(testFilePath, Buffer.from(testFileContent), {
        contentType: 'text/plain'
      });

    if (uploadError) {
      console.error('Error uploading test file:', uploadError);
      console.log('This might indicate that RLS policies are already restricting access');
    } else {
      console.log('Test file uploaded successfully');

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

    return true;
  } catch (error) {
    console.error('Exception fixing storage RLS:', error);
    return false;
  }
}

// Run the function
fixStorageRLS()
  .then(success => {
    if (success) {
      console.log('\nStorage RLS policy check completed. Please follow the manual instructions above.');
      process.exit(0);
    } else {
      console.error('\nFailed to complete storage RLS policy check.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
