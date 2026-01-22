-- Add sector_id to users_unified
ALTER TABLE users_unified 
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_unified_sector_id ON users_unified(sector_id);
