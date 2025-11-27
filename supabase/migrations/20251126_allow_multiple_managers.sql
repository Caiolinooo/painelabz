-- Migration to allow multiple managers to evaluate the same employee in the same period
-- Data: 2025-11-26

-- 1. Drop existing unique constraint if it exists (funcionario_id + periodo_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'avaliacoes_desempenho_funcionario_id_periodo_id_key'
    ) THEN
        ALTER TABLE avaliacoes_desempenho
        DROP CONSTRAINT avaliacoes_desempenho_funcionario_id_periodo_id_key;
    END IF;
END $$;

-- 2. Add new unique constraint (funcionario_id + periodo_id + avaliador_id)
-- This allows multiple evaluations for the same employee in the same period, provided they are from different managers.
ALTER TABLE avaliacoes_desempenho
ADD CONSTRAINT avaliacoes_desempenho_unique_evaluation 
UNIQUE (funcionario_id, periodo_id, avaliador_id);

-- 3. Comment explaining the change
COMMENT ON CONSTRAINT avaliacoes_desempenho_unique_evaluation ON avaliacoes_desempenho IS 'Ensures a manager can only evaluate an employee once per period, but allows multiple managers to evaluate the same employee.';
