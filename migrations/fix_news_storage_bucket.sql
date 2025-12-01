-- Migration: Fix 'news' bucket to 'news-media' for consistency
-- The upload API expects bucket 'news' but everywhere else uses 'news-media'
-- This migration renames or creates the correct bucket

DO $$
BEGIN
  -- Check if 'news-media' bucket exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'news-media'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('news-media', 'news-media', true);
    
    RAISE NOTICE 'Created bucket: news-media';
  END IF;

  -- Also create 'news' bucket as alias if it doesn't exist
  -- This ensures compatibility with upload API
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'news'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('news', 'news', true);
    
    RAISE NOTICE 'Created bucket: news';
  END IF;
END $$;

-- Set up RLS policies for news bucket
-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload to news"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news');

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public can read news files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news');

-- Allow authenticated users to delete their own uploads
CREATE POLICY IF NOT EXISTS "Users can delete their uploads in news"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'news');

-- Set up RLS policies for news-media bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload to news-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news-media');

CREATE POLICY IF NOT EXISTS "Public can read news-media files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news-media');

CREATE POLICY IF NOT EXISTS "Users can delete their uploads in news-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'news-media');

-- Migration successful
DO $$ 
BEGIN 
  RAISE NOTICE 'Storage buckets configured successfully';
END $$;
