-- ============================================================
-- Migration: Signer Identity Fields
-- Created: 2026-05-21
-- Description: Adds birth_date to user profiles, and
--              external_signer_tax_id / external_signer_birth_date
--              to signature requests to enable strong identity
--              validation during mobile signing (Step AUTH).
-- ============================================================

-- 1. Data de nascimento no perfil do usuário do portal
ALTER TABLE users_unified
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN users_unified.birth_date IS 'Data de nascimento do colaborador (usado na validação de assinatura eletrônica)';

-- 2. CPF e data de nascimento de signatários externos em solicitações
ALTER TABLE solicitacoes_assinatura
  ADD COLUMN IF NOT EXISTS external_signer_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS external_signer_birth_date DATE;

COMMENT ON COLUMN solicitacoes_assinatura.external_signer_tax_id IS 'CPF normalizado (apenas dígitos) do signatário externo, para validação na assinatura mobile';
COMMENT ON COLUMN solicitacoes_assinatura.external_signer_birth_date IS 'Data de nascimento do signatário externo, para validação na assinatura mobile';

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_unified_birth_date
  ON users_unified(birth_date);

CREATE INDEX IF NOT EXISTS idx_solic_ext_tax_id
  ON solicitacoes_assinatura(external_signer_tax_id);

-- 4. Verificação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_unified' AND column_name = 'birth_date'
  ) THEN
    RAISE NOTICE 'OK: users_unified.birth_date adicionada';
  ELSE
    RAISE EXCEPTION 'FALHA: users_unified.birth_date não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solicitacoes_assinatura' AND column_name = 'external_signer_tax_id'
  ) THEN
    RAISE NOTICE 'OK: solicitacoes_assinatura.external_signer_tax_id adicionada';
  ELSE
    RAISE EXCEPTION 'FALHA: solicitacoes_assinatura.external_signer_tax_id não encontrada';
  END IF;
END $$;
