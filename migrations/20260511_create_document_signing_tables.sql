-- ============================================================
-- Migration: Document Signing Module
-- Created: 2026-05-11
-- Description: Tables for electronic document signing with
--              full audit trail and legal validity.
-- ============================================================

-- 1. Enum for signature request status
DO $$ BEGIN
    CREATE TYPE signature_request_status AS ENUM ('PENDING', 'SIGNED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Documentos trabalhistas (uploaded by HR)
CREATE TABLE IF NOT EXISTS documentos_trabalhistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    arquivo_url TEXT NOT NULL,
    arquivo_nome VARCHAR(255),
    arquivo_tamanho BIGINT,
    hash_original VARCHAR(64) NOT NULL,
    enviado_por UUID NOT NULL REFERENCES users_unified(id),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Solicitações de assinatura (assignment by HR)
CREATE TABLE IF NOT EXISTS solicitacoes_assinatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_trabalhistas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES users_unified(id),
    pagina_assinatura INT NOT NULL DEFAULT 1,
    posicao_x FLOAT NOT NULL,
    posicao_y FLOAT NOT NULL,
    largura_assinatura FLOAT DEFAULT 150,
    altura_assinatura FLOAT DEFAULT 50,
    status signature_request_status DEFAULT 'PENDING',
    notificado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(documento_id, colaborador_id)
);

-- 4. Auditoria de assinaturas (the legal heart)
CREATE TABLE IF NOT EXISTS auditoria_assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id UUID NOT NULL REFERENCES solicitacoes_assinatura(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES users_unified(id),
    ip_origem VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    data_assinatura TIMESTAMPTZ DEFAULT NOW(),
    hash_final VARCHAR(64) NOT NULL,
    arquivo_assinado_url TEXT,
    metadados JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_docs_enviado_por ON documentos_trabalhistas(enviado_por);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documentos_trabalhistas(status);
CREATE INDEX IF NOT EXISTS idx_docs_data ON documentos_trabalhistas(data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_solic_documento ON solicitacoes_assinatura(documento_id);
CREATE INDEX IF NOT EXISTS idx_solic_colaborador ON solicitacoes_assinatura(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_solic_status ON solicitacoes_assinatura(status);

CREATE INDEX IF NOT EXISTS idx_audit_solicitacao ON auditoria_assinaturas(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_audit_colaborador ON auditoria_assinaturas(colaborador_id);

-- 6. RLS Policies (service_role bypass)
ALTER TABLE documentos_trabalhistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_assinatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_assinaturas ENABLE ROW LEVEL SECURITY;

-- Service role policies (our API routes use supabaseAdmin with service_role)
DO $$ BEGIN
    CREATE POLICY "service_full_documentos" ON documentos_trabalhistas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "service_full_solicitacoes" ON solicitacoes_assinatura FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "service_full_auditoria" ON auditoria_assinaturas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. View: documentos with aggregated signature info
CREATE OR REPLACE VIEW vw_documentos_completo AS
SELECT
    d.id,
    d.titulo,
    d.descricao,
    d.arquivo_url,
    d.arquivo_nome,
    d.arquivo_tamanho,
    d.hash_original,
    d.enviado_por,
    d.status,
    d.data_criacao,
    d.updated_at,
    u.first_name || ' ' || u.last_name AS enviado_por_nome,
    COUNT(s.id) FILTER (WHERE COALESCE(s.tipo, '') != 'copia') AS total_solicitacoes,
    COUNT(s.id) FILTER (WHERE COALESCE(s.tipo, '') != 'copia' AND s.status = 'SIGNED') AS total_assinados,
    COUNT(s.id) FILTER (WHERE COALESCE(s.tipo, '') != 'copia' AND s.status = 'PENDING') AS total_pendentes,
    COUNT(s.id) FILTER (WHERE COALESCE(s.tipo, '') != 'copia' AND s.status = 'REJECTED') AS total_rejeitados
FROM documentos_trabalhistas d
LEFT JOIN users_unified u ON d.enviado_por = u.id
LEFT JOIN solicitacoes_assinatura s ON s.documento_id = d.id
GROUP BY d.id, d.titulo, d.descricao, d.arquivo_url, d.arquivo_nome,
         d.arquivo_tamanho, d.hash_original, d.enviado_por, d.status,
         d.data_criacao, d.updated_at, u.first_name, u.last_name;

-- 8. Storage bucket (run manually in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-trabalhistas', 'documentos-trabalhistas', false) ON CONFLICT DO NOTHING;
