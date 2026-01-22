-- Add status column to users_unified table
-- Run this in Supabase SQL Editor

-- Add status column if not exists
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users_unified(status);

-- Allow users to update their own status
CREATE POLICY IF NOT EXISTS "Users can update own status"
ON users_unified FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
