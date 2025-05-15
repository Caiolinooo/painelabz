-- Script para corrigir o esquema do banco de dados para o módulo de avaliação

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
          data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
          data_fim DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 months'),
          status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
          pontuacao_total FLOAT DEFAULT 0,
          observacoes TEXT,
          deleted_at TIMESTAMP WITH TIME ZONE,
          data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
          email TEXT UNIQUE,
          matricula TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'afastado', 'ferias')),
          user_id UUID REFERENCES users(id),
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
