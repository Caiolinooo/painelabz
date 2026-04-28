-- Migration: Create IA Agent Tables
-- Date: 2026-04-22 (Revised 2026-04-28)
-- Description: Tabelas para o sistema de IA Agent (Chat, Dashboard, Config)
-- NOTA: Este projeto usa JWT custom (não Supabase Auth). RLS é desabilitado.
--       Permissões são validadas nas API Routes via verifyRequestToken().

-- =====================================================
-- Tabela de configuração do IA
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_default TEXT NOT NULL DEFAULT 'default',
    max_tokens INTEGER DEFAULT 8192,
    temperatura FLOAT DEFAULT 0.7,
    system_prompt TEXT DEFAULT '',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Tabela de sessões de chat
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    session_title TEXT NOT NULL DEFAULT 'Nova conversa',
    model_used TEXT,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- Tabela de mensagens
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ia_chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Tabela de cache do dashboard
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_dashboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    dashboard_type TEXT CHECK (dashboard_type IN ('summary', 'kpi', 'pendencies', 'dept')) NOT NULL,
    data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- Funções auxiliares
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_ia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ia_config_updated_at') THEN
        CREATE TRIGGER trg_ia_config_updated_at
            BEFORE UPDATE ON ia_config
            FOR EACH ROW EXECUTE FUNCTION update_ia_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ia_chat_sessions_updated_at') THEN
        CREATE TRIGGER trg_ia_chat_sessions_updated_at
            BEFORE UPDATE ON ia_chat_sessions
            FOR EACH ROW EXECUTE FUNCTION update_ia_updated_at();
    END IF;
END
$$;

-- Função para incrementar message_count na sessão
CREATE OR REPLACE FUNCTION increment_ia_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ia_chat_sessions 
    SET message_count = message_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ia_message_count') THEN
        CREATE TRIGGER trg_ia_message_count
            AFTER INSERT ON ia_chat_messages
            FOR EACH ROW EXECUTE FUNCTION increment_ia_session_message_count();
    END IF;
END
$$;

-- =====================================================
-- Índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ia_chat_sessions_user_id ON ia_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_chat_sessions_deleted ON ia_chat_sessions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ia_chat_messages_session_id ON ia_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ia_chat_messages_created ON ia_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_dashboard_cache_user_id ON ia_dashboard_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_dashboard_cache_type ON ia_dashboard_cache(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_ia_dashboard_cache_expires ON ia_dashboard_cache(expires_at);