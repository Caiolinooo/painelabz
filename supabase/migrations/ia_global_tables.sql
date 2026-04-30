-- Tabelas para o Sistema Global de IA do Portal ABZ
-- Execute este SQL no Supabase SQL Editor

-- =====================================================
-- Tabela: Permissões por Módulo
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,
  allow_read BOOLEAN DEFAULT true,
  allow_write BOOLEAN DEFAULT false,
  write_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO ia_module_permissions (module_key, allow_read, allow_write, write_roles) VALUES
  ('ferias', true, true, ARRAY['ADMIN', 'GERENTE']),
  ('reembolso', true, false, ARRAY['ADMIN']),
  ('ponto', true, false, ARRAY['ADMIN']),
  ('contracheque', true, false, ARRAY['ADMIN']),
  ('academy', true, true, ARRAY['ADMIN', 'GERENTE', 'USER']),
  ('avaliacao', true, true, ARRAY['ADMIN', 'GERENTE']),
  ('epi', true, true, ARRAY['ADMIN', 'GERENTE']),
  ('mio', true, false, ARRAY['ADMIN']),
  ('suprimentos', true, true, ARRAY['ADMIN', 'GERENTE']),
  ('chat', true, true, ARRAY['ADMIN', 'GERENTE', 'USER']),
  ('social', true, true, ARRAY['ADMIN', 'GERENTE', 'USER']),
  ('calendario', true, true, ARRAY['ADMIN', 'GERENTE', 'USER']),
  ('microsoft', true, false, ARRAY['ADMIN']),
  ('admin', true, true, ARRAY['ADMIN'])
ON CONFLICT (module_key) DO NOTHING;

-- =====================================================
-- Tabela: Configurações Globais IA
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão do Microsoft Graph
INSERT INTO ia_global_config (config_key, config_value, description) VALUES
  ('microsoft_write', 
   '{"email": false, "calendar": false, "teams": false, "onedrive": false}', 
   'Permissões de escrita para APIs Microsoft Graph'),
  ('action_confirmations',
   '{"auto_execute": false, "require_confirm": true}',
   'Configurações de confirmação de ações')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- Habilitar RLS (Row Level Security)
-- =====================================================
ALTER TABLE ia_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_global_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Apenas admins podem ver/modificar
CREATE POLICY "ia_module_permissions_admins" ON ia_module_permissions
  FOR ALL USING (true);

CREATE POLICY "ia_global_config_admins" ON ia_global_config
  FOR ALL USING (true);

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ia_module_permissions_key ON ia_module_permissions(module_key);
CREATE INDEX IF NOT EXISTS idx_ia_global_config_key ON ia_global_config(config_key);

-- =====================================================
-- Verificar criação
-- =====================================================
SELECT 'ia_module_permissions' as table_name, COUNT(*) as rows FROM ia_module_permissions
UNION ALL
SELECT 'ia_global_config', COUNT(*) FROM ia_global_config;