-- Add user_id to purchase_order_configs
ALTER TABLE purchase_order_configs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE;

-- Drop existing unique constraint on sector_id
ALTER TABLE purchase_order_configs 
DROP CONSTRAINT IF EXISTS purchase_order_configs_sector_id_key;

-- Create partial unique indexes to ensure:
-- 1. One config per sector (where user_id is null)
-- 2. One config per user (where user_id is not null)

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_configs_sector_unique 
ON purchase_order_configs(sector_id) 
WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_configs_user_unique 
ON purchase_order_configs(user_id) 
WHERE user_id IS NOT NULL;

-- Update RLS if needed (Admin editable is already ALL, so it covers user_id)
-- But we might need to verify if user_id inserts are allowed.
-- Existing policy: "Configs editable by admins" using EXISTS admin check. This covers INSERT/UPDATE/DELETE.
