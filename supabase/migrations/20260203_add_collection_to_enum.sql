-- Add 'collection' to the library_content_type enum
-- This fixes the "invalid input value" error when saving collection items

DO $$
BEGIN
    ALTER TYPE library_content_type ADD VALUE IF NOT EXISTS 'collection';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
