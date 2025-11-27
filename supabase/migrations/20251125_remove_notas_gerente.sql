-- Migration: Remover coluna notas_gerente
-- Data: 2025-11-25
-- Objetivo: Simplificar sistema de avaliação - gerente não avalia Q11-Q14

-- =====================================================
-- BACKUP: Criar tabela de backup antes de remover
-- =====================================================
CREATE TABLE IF NOT EXISTS avaliacoes_desempenho_backup_notas_gerente AS
SELECT id, notas_gerente, updated_at
FROM avaliacoes_desempenho
WHERE notas_gerente IS NOT NULL;

-- Adicionar timestamp ao backup
ALTER TABLE avaliacoes_desempenho_backup_notas_gerente
ADD COLUMN backup_created_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- REMOVER COLUNA: notas_gerente
-- =====================================================
ALTER TABLE avaliacoes_desempenho
DROP COLUMN IF EXISTS notas_gerente;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE avaliacoes_desempenho_backup_notas_gerente IS 'Backup das notas do gerente para Q11-Q14 antes da remoção. Criado em 2025-11-25';

-- =====================================================
-- LOG DA MIGRATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251125_remove_notas_gerente executada com sucesso';
  RAISE NOTICE 'Backup criado em: avaliacoes_desempenho_backup_notas_gerente';
  RAISE NOTICE 'Registros com backup: %', (SELECT COUNT(*) FROM avaliacoes_desempenho_backup_notas_gerente);
END $$;
