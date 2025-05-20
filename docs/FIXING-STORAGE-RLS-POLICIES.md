# Fixing Storage RLS Policies

This document provides instructions for fixing Row Level Security (RLS) policies for storage buckets in the Supabase database.

## Automatic Solutions

### Option 1: Make the Bucket Public (Quick Fix)

If you're having persistent issues with RLS policies, you can temporarily make the bucket public as a quick fix:

```bash
npm run db:make-bucket-public
```

This script will:
1. Make the "comprovantes" bucket public, which bypasses RLS policies
2. Test if you can upload files to the bucket
3. Provide instructions for securing the bucket properly in the future

**Note:** Making the bucket public means anyone can access the files without authentication. This is not recommended for production environments but can be a quick fix for development or testing.

### Option 2: Check RLS Policies

If you prefer to keep the bucket private and configure RLS policies properly, run:

```bash
npm run db:fix-storage-rls
```

This script will:
1. Check if the "comprovantes" bucket exists
2. Try to create it if it doesn't exist
3. Test if you have write access to the bucket
4. Provide detailed instructions for manually configuring RLS policies

If the automatic solutions don't work, you can try the following manual steps.

## Manual Fix

### Step 1: Log in to the Supabase Dashboard

1. Go to the [Supabase Dashboard](https://app.supabase.io)
2. Select your project

### Step 2: Navigate to the Storage Section

1. Click on "Storage" in the left sidebar
2. You should see a list of buckets, including the "comprovantes" bucket

### Step 3: Check if the Bucket Exists

1. If the "comprovantes" bucket doesn't exist, create it:
   - Click on "New Bucket"
   - Enter "comprovantes" as the bucket name
   - Uncheck "Public bucket" to make it private
   - Click "Create bucket"

### Step 4: Configure RLS Policies for the Bucket

1. Click on the "Policies" tab
2. For the "comprovantes" bucket, create the following policies:

#### Policy 1: Allow all authenticated users to read files

- Click on "New Policy"
- Policy Name: "Allow all authenticated users to read files"
- Allowed operation: SELECT
- Definition: `(auth.role() = 'authenticated')`
- Click "Save Policy"

#### Policy 2: Allow all authenticated users to insert files

- Click on "New Policy"
- Policy Name: "Allow all authenticated users to insert files"
- Allowed operation: INSERT
- Definition: `(auth.role() = 'authenticated')`
- Click "Save Policy"

#### Policy 3: Allow all authenticated users to update files

- Click on "New Policy"
- Policy Name: "Allow all authenticated users to update files"
- Allowed operation: UPDATE
- Definition: `(auth.role() = 'authenticated')`
- Click "Save Policy"

#### Policy 4: Allow all authenticated users to delete files

- Click on "New Policy"
- Policy Name: "Allow all authenticated users to delete files"
- Allowed operation: DELETE
- Definition: `(auth.role() = 'authenticated')`
- Click "Save Policy"

### Step 5: Test the Policies

1. Go back to your application
2. Try to upload a file to the "comprovantes" bucket
3. If the upload is successful, the RLS policies are working correctly

## Alternative SQL Method

If you prefer to use SQL to configure the policies, you can use the SQL Editor in the Supabase dashboard to run the following SQL:

```sql
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
```

## Troubleshooting

If you're still experiencing issues with storage RLS policies, try the following:

1. Check if you're authenticated when trying to upload files:
   - Make sure you're logged in to the application
   - Check if the authentication token is being properly passed to the Supabase client

2. Check if the bucket exists:
   - Go to the Storage section in the Supabase dashboard
   - Verify that the "comprovantes" bucket exists

3. Check if the RLS policies are properly configured:
   - Go to the Policies tab in the Storage section
   - Verify that all four policies (SELECT, INSERT, UPDATE, DELETE) are properly configured for the "comprovantes" bucket

4. Try a simpler policy definition:
   - If the current policies aren't working, try using `true` as the definition for all policies
   - This will allow anyone to perform operations on the bucket, which is not secure but can help diagnose the issue

5. Check the browser console for detailed error messages:
   - Open the browser developer tools (F12)
   - Go to the Console tab
   - Look for error messages related to storage or RLS

6. Temporarily disable RLS (Not recommended for production):
   - As a last resort for testing, you can temporarily make the bucket public
   - In the Supabase dashboard, go to the Storage section
   - Click on the "comprovantes" bucket
   - Click "Edit bucket"
   - Check "Public bucket"
   - Click "Update"
   - Note: This is not recommended for production as it makes all files publicly accessible

7. Check for toast implementation errors:
   - If you see errors like `TypeError: react_hot_toast__WEBPACK_IMPORTED_MODULE_4__.toast.warning is not a function`
   - Make sure you're importing toast correctly in your components
   - Use `import toast from 'react-hot-toast'` instead of `import { toast } from 'react-hot-toast'`

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage RLS Examples](https://supabase.com/docs/guides/storage/security/access-control)
