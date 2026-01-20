-- Simplified Migration: Create module_access table
-- Run this in Supabase SQL Editor

-- Drop if exists (for clean re-run)
DROP TABLE IF EXISTS module_access CASCADE;

-- Create table WITHOUT foreign key (since we insert via service role)
CREATE TABLE module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- No FK constraint, allows any UUID or null
    module_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    module_href TEXT,
    access_type TEXT DEFAULT 'click',
    duration_seconds INTEGER DEFAULT 0,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    user_agent TEXT,
    referrer TEXT,
    is_external BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_module_access_module_id ON module_access(module_id);
CREATE INDEX idx_module_access_user_id ON module_access(user_id);
CREATE INDEX idx_module_access_accessed_at ON module_access(accessed_at);

-- Allow service role full access (API uses supabaseAdmin)
-- No RLS needed since we use service role key
