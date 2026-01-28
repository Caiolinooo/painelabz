-- Migration: Create user_shortcuts table for personalized module shortcuts
-- Run this in Supabase SQL Editor

-- Create table for storing user shortcuts
CREATE TABLE IF NOT EXISTS user_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT,
    module_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    module_href TEXT NOT NULL,
    icon TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user_id ON user_shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_position ON user_shortcuts(position);
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user_email ON user_shortcuts(user_email);

-- Add comment to explain the table
COMMENT ON TABLE user_shortcuts IS 'Stores personalized module shortcuts for each user';

-- Verify table was created
SELECT 'user_shortcuts table created successfully' as status;
