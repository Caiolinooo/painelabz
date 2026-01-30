-- Add approver_ids column to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS approver_ids UUID[] DEFAULT '{}';

-- Create index for faster lookups (using GIN for array containment checks)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approver_ids 
ON purchase_orders USING GIN (approver_ids);
