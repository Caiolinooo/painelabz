-- Script para criar a tabela avaliacoes_desempenho no Supabase

-- Verificar se a extensão uuid-ossp está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar se a tabela já existe e removê-la se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'avaliacoes_desempenho') THEN
        DROP TABLE IF EXISTS avaliacoes_desempenho CASCADE;
        RAISE NOTICE 'Tabela avaliacoes_desempenho existente foi removida.';
    END IF;
END
$$;

-- Criar a tabela avaliacoes_desempenho
CREATE TABLE IF NOT EXISTS avaliacoes_desempenho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL,
  avaliador_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  pontuacao_total FLOAT DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_avaliacoes_desempenho_funcionario_id ON avaliacoes_desempenho(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_desempenho_avaliador_id ON avaliacoes_desempenho(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_desempenho_status ON avaliacoes_desempenho(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_desempenho_periodo ON avaliacoes_desempenho(periodo);

-- Criar trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_avaliacoes_desempenho_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avaliacoes_desempenho_updated_at
BEFORE UPDATE ON avaliacoes_desempenho
FOR EACH ROW
EXECUTE FUNCTION update_avaliacoes_desempenho_updated_at();

-- Habilitar RLS na tabela
ALTER TABLE avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança RLS
CREATE POLICY avaliacoes_desempenho_select ON avaliacoes_desempenho
  FOR SELECT USING (
    -- Administradores podem ver todas as avaliações
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    OR
    -- Gerentes podem ver avaliações onde são avaliadores
    ((SELECT role FROM users WHERE id = auth.uid()) = 'MANAGER' AND
     avaliador_id IN (SELECT id FROM funcionarios WHERE user_id = auth.uid()))
    OR
    -- Usuários podem ver suas próprias avaliações
    funcionario_id IN (SELECT id FROM funcionarios WHERE user_id = auth.uid())
  );

-- Copiar dados da tabela avaliacoes para avaliacoes_desempenho
INSERT INTO avaliacoes_desempenho (
  id, funcionario_id, avaliador_id, periodo, data_inicio, data_fim,
  status, pontuacao_total, observacoes, deleted_at, created_at, updated_at
)
SELECT
  id, funcionario_id, avaliador_id, periodo, data_inicio, data_fim,
  status, pontuacao_total, observacoes, deleted_at, created_at, updated_at
FROM
  avaliacoes
WHERE
  deleted_at IS NULL;

-- Informar ao usuário que a tabela foi criada
DO $$
BEGIN
    RAISE NOTICE 'Tabela avaliacoes_desempenho criada com sucesso!';
END
$$;
