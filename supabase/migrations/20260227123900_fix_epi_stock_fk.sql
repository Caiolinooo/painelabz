-- Drop the existing constraint that points to auth.users
ALTER TABLE epi_stock_movements DROP CONSTRAINT IF EXISTS epi_stock_movements_performed_by_fkey;
ALTER TABLE epi_stock_movements DROP CONSTRAINT IF EXISTS epi_stock_movements_performed_by_fk;

-- Add the new constraint pointing to users_unified
ALTER TABLE epi_stock_movements ADD CONSTRAINT epi_stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users_unified(id) ON DELETE SET NULL;
