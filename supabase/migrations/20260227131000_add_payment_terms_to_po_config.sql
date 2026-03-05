-- Migration to add dynamic payment_terms to purchase order config for admins
ALTER TABLE purchase_order_configs ADD COLUMN IF NOT EXISTS payment_terms TEXT[] DEFAULT '{}';
