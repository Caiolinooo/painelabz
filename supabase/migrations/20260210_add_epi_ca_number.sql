-- Add ca_number to epi_types
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS ca_number TEXT;
