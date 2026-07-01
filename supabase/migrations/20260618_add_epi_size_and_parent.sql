-- Migration: Add parent_id and size to epi_types
-- Created: 2026-06-18
-- Description: Adds columns to support size variations for EPI types

ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES epi_types(id) ON DELETE CASCADE;
ALTER TABLE epi_types ADD COLUMN IF NOT EXISTS size TEXT;
