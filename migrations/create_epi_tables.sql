-- Migration: Create EPI tables
-- Created: 2026-02-06
-- Description: Creates tables for Equipamentos de Proteção Individual (EPI) management

-- Create epi_registrations table
CREATE TABLE IF NOT EXISTS epi_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    equipment_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered', 'returned')),
    observation TEXT,
    approved_by UUID REFERENCES users_unified(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create epi_types table
CREATE TABLE IF NOT EXISTS epi_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_epi_registrations_user_id ON epi_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_epi_registrations_status ON epi_registrations(status);
CREATE INDEX IF NOT EXISTS idx_epi_registrations_created_at ON epi_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_epi_types_name ON epi_types(name);
CREATE INDEX IF NOT EXISTS idx_epi_types_category ON epi_types(category);

-- Enable Row Level Security (RLS)
ALTER TABLE epi_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epi_registrations
-- Users can view their own registrations
CREATE POLICY "Users can view own registrations" ON epi_registrations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own registrations
CREATE POLICY "Users can create registrations" ON epi_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending registrations
CREATE POLICY "Users can update own registrations" ON epi_registrations
    FOR UPDATE USING (
        (auth.uid() = user_id AND status = 'pending') OR
        EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
    );

-- Admins and managers can view all registrations
CREATE POLICY "Admins can view all registrations" ON epi_registrations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
    );

-- RLS Policies for epi_types
-- Everyone can view EPI types
CREATE POLICY "Anyone can view EPI types" ON epi_types
    FOR SELECT USING (true);

-- Only admins can insert/update/delete EPI types
CREATE POLICY "Admins can manage EPI types" ON epi_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- Seed common EPI types
INSERT INTO epi_types (name, description, category, is_required) VALUES
    ('Capacete de Segurança', 'Capacho de proteção craniana com viseira', 'Proteção Craniana', true),
    ('Óculos de Proteção', 'Óculos de segurança contra impactos e partículas', 'Proteção Ocular', true),
    ('Luvas de Proteção', 'Luvas de segurança para trabalho geral', 'Proteção das Mãos', true),
    ('Botas de Segurança', 'Botas com biqueira de aço e solado antiperfuração', 'Proteção dos Pés', true),
    ('Colete Refletivo', 'Colete de alta visibilidade com faixas refletivas', 'Proteção Visual', true),
    ('Protetor Auricular', 'Protetor de ouvido tipo concha ou plug', 'Proteção Auditiva', true),
    ('Máscara de Proteção', 'Máscara contra poeira, fumes ou vapores', 'Proteção Respiratória', false),
    ('Capuz de Proteção', 'Capuz proteção térmica ou química', 'Proteção Corporal', false),
    ('Cinto de Segurança', 'Cinto de segurança para trabalho em altura', 'Queda', true),
    ('Avental de Proteção', 'Avental de proteção química ou térmica', 'Proteção Corporal', false)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for epi_registrations
DROP TRIGGER IF EXISTS update_epi_registrations_updated_at ON epi_registrations;
CREATE TRIGGER update_epi_registrations_updated_at
    BEFORE UPDATE ON epi_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment on tables
COMMENT ON TABLE epi_registrations IS 'Registros de solicitações de Equipamentos de Proteção Individual';
COMMENT ON TABLE epi_types IS 'Catálogo de tipos de Equipamentos de Proteção Individual disponíveis';
