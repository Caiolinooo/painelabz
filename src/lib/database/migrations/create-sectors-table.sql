-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for sectors
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

-- Create policy for sectors (viewable by all authenticated users, editable by admins)
CREATE POLICY "Sectors viewable by authenticated users" 
    ON sectors FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Sectors editable by admins" 
    ON sectors FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users_unified 
            WHERE users_unified.id = auth.uid() 
            AND users_unified.role IN ('admin', 'ADMIN')
        )
    );

-- Create sector_modules table
CREATE TABLE IF NOT EXISTS sector_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL, -- References cards.id (text based IDs like 'reembolso', 'noticias')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_id, module_id)
);

-- Enable RLS for sector_modules
ALTER TABLE sector_modules ENABLE ROW LEVEL SECURITY;

-- Create policy for sector_modules (viewable by all, editable by admins)
CREATE POLICY "Sector modules viewable by authenticated users" 
    ON sector_modules FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Sector modules editable by admins" 
    ON sector_modules FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users_unified 
            WHERE users_unified.id = auth.uid() 
            AND users_unified.role IN ('admin', 'ADMIN')
        )
    );

-- Add indexes
CREATE INDEX idx_sector_modules_sector ON sector_modules(sector_id);
CREATE INDEX idx_sector_modules_module ON sector_modules(module_id);
