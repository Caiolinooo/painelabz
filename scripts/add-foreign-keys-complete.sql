-- Script para adicionar chaves estrangeiras à tabela avaliacoes_desempenho

-- Verificar se as chaves estrangeiras já existem e removê-las se necessário
DO $$
BEGIN
    -- Remover chave estrangeira funcionario_id se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_avaliacoes_desempenho_funcionario' 
        AND table_name = 'avaliacoes_desempenho'
    ) THEN
        ALTER TABLE avaliacoes_desempenho DROP CONSTRAINT fk_avaliacoes_desempenho_funcionario;
    END IF;

    -- Remover chave estrangeira avaliador_id se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_avaliacoes_desempenho_avaliador' 
        AND table_name = 'avaliacoes_desempenho'
    ) THEN
        ALTER TABLE avaliacoes_desempenho DROP CONSTRAINT fk_avaliacoes_desempenho_avaliador;
    END IF;
END
$$;

-- Adicionar chave estrangeira para funcionario_id
ALTER TABLE avaliacoes_desempenho
ADD CONSTRAINT fk_avaliacoes_desempenho_funcionario
FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id);

-- Adicionar chave estrangeira para avaliador_id
ALTER TABLE avaliacoes_desempenho
ADD CONSTRAINT fk_avaliacoes_desempenho_avaliador
FOREIGN KEY (avaliador_id) REFERENCES funcionarios(id);

-- Verificar se os índices já existem e removê-los se necessário
DO $$
BEGIN
    -- Remover índice funcionario_id se existir
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_avaliacoes_desempenho_funcionario_id'
    ) THEN
        DROP INDEX idx_avaliacoes_desempenho_funcionario_id;
    END IF;

    -- Remover índice avaliador_id se existir
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_avaliacoes_desempenho_avaliador_id'
    ) THEN
        DROP INDEX idx_avaliacoes_desempenho_avaliador_id;
    END IF;
END
$$;

-- Adicionar índices para melhorar o desempenho
CREATE INDEX idx_avaliacoes_desempenho_funcionario_id ON avaliacoes_desempenho(funcionario_id);
CREATE INDEX idx_avaliacoes_desempenho_avaliador_id ON avaliacoes_desempenho(avaliador_id);

-- Atualizar as permissões RLS para permitir joins
ALTER POLICY avaliacoes_desempenho_select ON avaliacoes_desempenho
USING (true);

-- Criar uma view para facilitar o acesso aos dados relacionados
CREATE OR REPLACE VIEW vw_avaliacoes_desempenho AS
SELECT 
    a.id,
    a.funcionario_id,
    a.avaliador_id,
    a.periodo,
    a.data_inicio,
    a.data_fim,
    a.status,
    a.pontuacao_total,
    a.observacoes,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    f.nome AS funcionario_nome,
    f.cargo AS funcionario_cargo,
    f.departamento AS funcionario_departamento,
    av.nome AS avaliador_nome,
    av.cargo AS avaliador_cargo
FROM 
    avaliacoes_desempenho a
LEFT JOIN 
    funcionarios f ON a.funcionario_id = f.id
LEFT JOIN 
    funcionarios av ON a.avaliador_id = av.id
WHERE 
    a.deleted_at IS NULL;
