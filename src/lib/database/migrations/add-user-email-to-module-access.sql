-- Migration: Add user_email column to module_access table
-- Run this in Supabase SQL Editor

-- Add user_email column if it doesn't exist
ALTER TABLE module_access 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add index for faster queries by email
CREATE INDEX IF NOT EXISTS idx_module_access_user_email 
ON module_access(user_email);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'module_access' 
AND column_name = 'user_email';
