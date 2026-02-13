-- Migration: Create epi_ca_cache table for CA lookup caching
-- Created: 2026-02-11
-- Description: Cache table for CA (Certificado de Aprovação) data from MTE FTP

-- Create the cache table
CREATE TABLE IF NOT EXISTS epi_ca_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ca_number TEXT UNIQUE NOT NULL,
    validity_date TIMESTAMPTZ,
    status TEXT,
    manufacturer TEXT,
    equipment_name TEXT,
    equipment_description TEXT,
    brand TEXT,
    process_number TEXT,
    norm TEXT,
    source TEXT DEFAULT 'ftp',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup by CA number
CREATE INDEX IF NOT EXISTS idx_epi_ca_cache_number ON epi_ca_cache(ca_number);
CREATE INDEX IF NOT EXISTS idx_epi_ca_cache_last_synced ON epi_ca_cache(last_synced);

-- Enable RLS
ALTER TABLE epi_ca_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read CA cache (public data)
CREATE POLICY "Anyone can read CA cache"
ON epi_ca_cache FOR SELECT
USING (true);

-- Only admins/managers can insert/update CA cache
CREATE POLICY "Service role can manage CA cache"
ON epi_ca_cache FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users_unified
        WHERE users_unified.id = auth.uid()
        AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
    )
);

-- Add CA metadata columns to epi_types if they don't exist
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS ca_validity_date TIMESTAMPTZ;
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS ca_status TEXT;
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS ca_manufacturer TEXT;
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS ca_equipment_name TEXT;

-- Add CA metadata columns to epi_registrations if they don't exist
ALTER TABLE epi_registrations ADD COLUMN IF NOT EXISTS ca_validity_date TIMESTAMPTZ;
ALTER TABLE epi_registrations ADD COLUMN IF NOT EXISTS ca_status TEXT;

-- Comments
COMMENT ON TABLE epi_ca_cache IS 'Cache de dados de CA (Certificado de Aprovação) do MTE para consulta rápida';
COMMENT ON COLUMN epi_ca_cache.ca_number IS 'Número do Certificado de Aprovação';
COMMENT ON COLUMN epi_ca_cache.source IS 'Origem dos dados: ftp, scraping ou manual';
COMMENT ON COLUMN epi_ca_cache.last_synced IS 'Última sincronização dos dados';
