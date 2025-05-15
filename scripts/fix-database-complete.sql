-- Script completo para corrigir o banco de dados
-- Este script cria as tabelas necessárias e insere dados de exemplo

-- Criar extensão uuid-ossp se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar se a tabela funcionarios existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funcionarios') THEN
        RAISE NOTICE 'Criando tabela funcionarios...';
        
        -- Criar tabela funcionarios
        CREATE TABLE funcionarios (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome TEXT NOT NULL,
            cargo TEXT,
            departamento TEXT,
            email TEXT,
            user_id UUID,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Inserir dados de exemplo
        INSERT INTO funcionarios (nome, cargo, departamento, email)
        VALUES 
            ('João Silva', 'Gerente', 'TI', 'joao.silva@example.com'),
            ('Maria Santos', 'Desenvolvedor', 'TI', 'maria.santos@example.com'),
            ('Pedro Oliveira', 'Analista', 'RH', 'pedro.oliveira@example.com'),
            ('Ana Costa', 'Coordenador', 'Marketing', 'ana.costa@example.com');
        
        RAISE NOTICE 'Tabela funcionarios criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela funcionarios já existe.';
    END IF;
END
$$;

-- Verificar se a tabela avaliacoes existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avaliacoes') THEN
        RAISE NOTICE 'Criando tabela avaliacoes...';
        
        -- Criar tabela avaliacoes
        CREATE TABLE avaliacoes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            funcionario_id UUID NOT NULL,
            avaliador_id UUID NOT NULL,
            periodo TEXT NOT NULL,
            data_inicio DATE DEFAULT CURRENT_DATE,
            data_fim DATE DEFAULT (CURRENT_DATE + INTERVAL '3 months'),
            status TEXT NOT NULL DEFAULT 'pending',
            pontuacao_total FLOAT DEFAULT 0,
            observacoes TEXT,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX idx_avaliacoes_funcionario_id ON avaliacoes(funcionario_id);
        CREATE INDEX idx_avaliacoes_avaliador_id ON avaliacoes(avaliador_id);
        
        -- Adicionar chaves estrangeiras
        ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_funcionario
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id);
        
        ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_avaliador
        FOREIGN KEY (avaliador_id) REFERENCES funcionarios(id);
        
        RAISE NOTICE 'Tabela avaliacoes criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela avaliacoes já existe.';
    END IF;
END
$$;

-- Verificar se a coluna data_criacao existe na tabela avaliacoes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes' AND column_name = 'data_criacao'
    ) THEN
        RAISE NOTICE 'Adicionando coluna data_criacao à tabela avaliacoes...';
        
        ALTER TABLE avaliacoes
        ADD COLUMN data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Atualizar os registros existentes para usar created_at como data_criacao
        UPDATE avaliacoes
        SET data_criacao = created_at
        WHERE data_criacao IS NULL;
        
        RAISE NOTICE 'Coluna data_criacao adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna data_criacao já existe na tabela avaliacoes.';
    END IF;
END
$$;

-- Verificar se a coluna data_atualizacao existe na tabela avaliacoes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes' AND column_name = 'data_atualizacao'
    ) THEN
        RAISE NOTICE 'Adicionando coluna data_atualizacao à tabela avaliacoes...';
        
        ALTER TABLE avaliacoes
        ADD COLUMN data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Atualizar os registros existentes para usar updated_at como data_atualizacao
        UPDATE avaliacoes
        SET data_atualizacao = updated_at
        WHERE data_atualizacao IS NULL;
        
        RAISE NOTICE 'Coluna data_atualizacao adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna data_atualizacao já existe na tabela avaliacoes.';
    END IF;
END
$$;

-- Criar a view vw_avaliacoes_desempenho
DROP VIEW IF EXISTS vw_avaliacoes_desempenho;

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
  a.data_criacao,
  a.data_atualizacao,
  a.deleted_at,
  f_func.nome AS funcionario_nome,
  f_func.cargo AS funcionario_cargo,
  f_func.departamento AS funcionario_departamento,
  f_func.email AS funcionario_email,
  f_aval.nome AS avaliador_nome,
  f_aval.cargo AS avaliador_cargo,
  f_aval.email AS avaliador_email
FROM 
  avaliacoes a
  LEFT JOIN funcionarios f_func ON a.funcionario_id = f_func.id
  LEFT JOIN funcionarios f_aval ON a.avaliador_id = f_aval.id
WHERE 
  a.deleted_at IS NULL;

-- Conceder permissões
GRANT ALL ON funcionarios TO authenticated;
GRANT ALL ON funcionarios TO anon;
GRANT ALL ON funcionarios TO service_role;

GRANT ALL ON avaliacoes TO authenticated;
GRANT ALL ON avaliacoes TO anon;
GRANT ALL ON avaliacoes TO service_role;

GRANT SELECT ON vw_avaliacoes_desempenho TO authenticated;
GRANT SELECT ON vw_avaliacoes_desempenho TO anon;
GRANT SELECT ON vw_avaliacoes_desempenho TO service_role;

-- Inserir dados de exemplo na tabela avaliacoes se estiver vazia
DO $$
DECLARE
    avaliador_id UUID;
    funcionario_id UUID;
    count_avaliacoes INTEGER;
BEGIN
    -- Verificar se já existem avaliações
    SELECT COUNT(*) INTO count_avaliacoes FROM avaliacoes;
    
    IF count_avaliacoes = 0 THEN
        -- Obter IDs de funcionários para usar como avaliador e avaliado
        SELECT id INTO avaliador_id FROM funcionarios WHERE cargo = 'Gerente' LIMIT 1;
        SELECT id INTO funcionario_id FROM funcionarios WHERE cargo = 'Desenvolvedor' LIMIT 1;
        
        -- Se não encontrou, usar os primeiros dois funcionários
        IF avaliador_id IS NULL THEN
            SELECT id INTO avaliador_id FROM funcionarios LIMIT 1;
        END IF;
        
        IF funcionario_id IS NULL OR funcionario_id = avaliador_id THEN
            SELECT id INTO funcionario_id FROM funcionarios WHERE id != avaliador_id LIMIT 1;
        END IF;
        
        -- Inserir avaliações de exemplo
        IF avaliador_id IS NOT NULL AND funcionario_id IS NOT NULL THEN
            INSERT INTO avaliacoes (
                funcionario_id, 
                avaliador_id, 
                periodo, 
                data_inicio, 
                data_fim, 
                status, 
                pontuacao_total, 
                observacoes,
                created_at,
                updated_at,
                data_criacao,
                data_atualizacao
            ) VALUES 
            (
                funcionario_id, 
                avaliador_id, 
                '2025-Q1', 
                '2025-01-01', 
                '2025-03-31', 
                'pending', 
                0, 
                'Avaliação do primeiro trimestre de 2025',
                NOW(),
                NOW(),
                NOW(),
                NOW()
            ),
            (
                funcionario_id, 
                avaliador_id, 
                '2024-Q4', 
                '2024-10-01', 
                '2024-12-31', 
                'completed', 
                4.5, 
                'Avaliação do quarto trimestre de 2024',
                NOW() - INTERVAL '3 months',
                NOW() - INTERVAL '3 months',
                NOW() - INTERVAL '3 months',
                NOW() - INTERVAL '3 months'
            );
            
            RAISE NOTICE 'Dados de exemplo inseridos na tabela avaliacoes.';
        ELSE
            RAISE NOTICE 'Não foi possível inserir dados de exemplo: funcionários insuficientes.';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela avaliacoes já contém dados.';
    END IF;
END
$$;
