-- Migration to add separate logo columns to site_configurations table
ALTER TABLE public.site_configurations
ADD COLUMN IF NOT EXISTS login_logo TEXT,
ADD COLUMN IF NOT EXISTS sidebar_logo TEXT,
ADD COLUMN IF NOT EXISTS widget_logo TEXT;
