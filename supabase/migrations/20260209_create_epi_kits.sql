-- Create EPI Kits table
CREATE TABLE IF NOT EXISTS epi_kits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id TEXT, -- Optional linkage to a sector (department)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create EPI Kit Items table
CREATE TABLE IF NOT EXISTS epi_kit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_id UUID NOT NULL REFERENCES epi_kits(id) ON DELETE CASCADE,
    epi_type_id UUID NOT NULL REFERENCES epi_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_epi_kits_sector ON epi_kits(sector_id);
CREATE INDEX IF NOT EXISTS idx_epi_kit_items_kit ON epi_kit_items(kit_id);

-- RLS Policies
ALTER TABLE epi_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_kit_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY admin_all_epi_kits ON epi_kits
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY admin_all_epi_kit_items ON epi_kit_items
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'));

-- Users can view kits (e.g., to see what they are assigned)
CREATE POLICY public_view_epi_kits ON epi_kits
    FOR SELECT
    USING (true);

CREATE POLICY public_view_epi_kit_items ON epi_kit_items
    FOR SELECT
    USING (true);
