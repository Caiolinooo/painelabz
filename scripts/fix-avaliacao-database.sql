-- Script para corrigir o banco de dados do módulo de avaliação

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
          status TEXT NOT NULL DEFAULT 'pendente',
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

-- Criar função para sincronizar usuários com funcionários
CREATE OR REPLACE FUNCTION sync_users_to_funcionarios()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existe um funcionário para este usuário
    IF NOT EXISTS (SELECT 1 FROM funcionarios WHERE user_id = NEW.id) THEN
        -- Inserir novo funcionário
        INSERT INTO funcionarios (
            id,
            nome,
            email,
            user_id,
            created_at,
            updated_at
        ) VALUES (
            uuid_generate_v4(),
            CONCAT(NEW.first_name, ' ', NEW.last_name),
            NEW.email,
            NEW.id,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronizar usuários com funcionários
DROP TRIGGER IF EXISTS trigger_sync_users_to_funcionarios ON users;

CREATE TRIGGER trigger_sync_users_to_funcionarios
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_users_to_funcionarios();

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
