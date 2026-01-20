-- Migration: Add duration_seconds column to news_post_views table
-- Run this in Supabase SQL Editor

-- Add duration_seconds column if it doesn't exist
ALTER TABLE news_post_views 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_post_views_duration 
ON news_post_views(post_id, duration_seconds);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'news_post_views' 
AND column_name = 'duration_seconds';
