-- Script para corrigir o banco de dados do módulo de avaliação
-- Este script deve ser executado diretamente no SQL Editor do Supabase

-- Verificar se a extensão uuid-ossp está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar se a tabela funcionarios existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funcionarios') THEN
        RAISE NOTICE 'Tabela funcionarios não existe, criando...';
        
        -- Criar a tabela funcionarios
        CREATE TABLE funcionarios (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          nome TEXT NOT NULL,
          cargo TEXT,
          departamento TEXT,
          data_admissao DATE,
          email TEXT,
          matricula TEXT,
          status TEXT NOT NULL DEFAULT 'ativo',
          user_id UUID,
          deleted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON funcionarios(user_id);
        CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);
    ELSE
        RAISE NOTICE 'Tabela funcionarios já existe';
    END IF;
END
$$;

-- Verificar se a tabela avaliacoes existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avaliacoes') THEN
        RAISE NOTICE 'Tabela avaliacoes não existe, criando...';
        
        -- Criar a tabela avaliacoes
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
          data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          data_atualizacao TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_avaliacoes_funcionario_id ON avaliacoes(funcionario_id);
        CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador_id ON avaliacoes(avaliador_id);
        CREATE INDEX IF NOT EXISTS idx_avaliacoes_status ON avaliacoes(status);
        CREATE INDEX IF NOT EXISTS idx_avaliacoes_periodo ON avaliacoes(periodo);
    ELSE
        RAISE NOTICE 'Tabela avaliacoes já existe';
    END IF;
END
$$;

-- Adicionar chaves estrangeiras à tabela avaliacoes se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_avaliacoes_funcionario' 
        AND table_name = 'avaliacoes'
    ) THEN
        RAISE NOTICE 'Adicionando chave estrangeira para funcionario_id na tabela avaliacoes...';
        
        ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_funcionario
        FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id);
    ELSE
        RAISE NOTICE 'Chave estrangeira para funcionario_id já existe na tabela avaliacoes';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_avaliacoes_avaliador' 
        AND table_name = 'avaliacoes'
    ) THEN
        RAISE NOTICE 'Adicionando chave estrangeira para avaliador_id na tabela avaliacoes...';
        
        ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_avaliador
        FOREIGN KEY (avaliador_id) REFERENCES funcionarios(id);
    ELSE
        RAISE NOTICE 'Chave estrangeira para avaliador_id já existe na tabela avaliacoes';
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
    ELSE
        RAISE NOTICE 'Coluna data_criacao já existe na tabela avaliacoes';
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
  a.data_criacao,
  a.data_atualizacao,
  a.created_at,
  a.updated_at,
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

-- Conceder permissões para a view
GRANT SELECT ON vw_avaliacoes_desempenho TO authenticated;
GRANT SELECT ON vw_avaliacoes_desempenho TO anon;
GRANT SELECT ON vw_avaliacoes_desempenho TO service_role;

-- Sincronizar usuários existentes com funcionários
INSERT INTO funcionarios (id, nome, email, user_id, created_at, updated_at)
SELECT 
    uuid_generate_v4(),
    CONCAT(u.first_name, ' ', u.last_name),
    u.email,
    u.id,
    NOW(),
    NOW()
FROM 
    users u
WHERE 
    NOT EXISTS (SELECT 1 FROM funcionarios f WHERE f.user_id = u.id)
    AND u.active = true;

-- Conceder permissões para as tabelas
GRANT ALL ON funcionarios TO authenticated;
GRANT ALL ON funcionarios TO anon;
GRANT ALL ON funcionarios TO service_role;

GRANT ALL ON avaliacoes TO authenticated;
GRANT ALL ON avaliacoes TO anon;
GRANT ALL ON avaliacoes TO service_role;
