-- Script para criar as tabelas do módulo de avaliação de desempenho no Supabase

-- Criar extensões necessárias (caso ainda não existam)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
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

-- Tabela de critérios de avaliação
CREATE TABLE IF NOT EXISTS criterios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  peso FLOAT NOT NULL DEFAULT 1.0,
  pontuacao_maxima INTEGER NOT NULL DEFAULT 5,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  avaliador_id UUID NOT NULL REFERENCES funcionarios(id),
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

-- Tabela de pontuações (notas para cada critério em uma avaliação)
CREATE TABLE IF NOT EXISTS pontuacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id),
  criterio_id UUID NOT NULL REFERENCES criterios(id),
  valor FLOAT NOT NULL CHECK (valor >= 0),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(avaliacao_id, criterio_id)
);

-- Criar índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON funcionarios(user_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);
CREATE INDEX IF NOT EXISTS idx_criterios_categoria ON criterios(categoria);
CREATE INDEX IF NOT EXISTS idx_criterios_ativo ON criterios(ativo);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_funcionario_id ON avaliacoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador_id ON avaliacoes(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_status ON avaliacoes(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_periodo ON avaliacoes(periodo);
CREATE INDEX IF NOT EXISTS idx_pontuacoes_avaliacao_id ON pontuacoes(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_pontuacoes_criterio_id ON pontuacoes(criterio_id);

-- Criar triggers para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger a todas as tabelas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_funcionarios_updated_at') THEN
        CREATE TRIGGER update_funcionarios_updated_at
        BEFORE UPDATE ON funcionarios
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_criterios_updated_at') THEN
        CREATE TRIGGER update_criterios_updated_at
        BEFORE UPDATE ON criterios
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_avaliacoes_updated_at') THEN
        CREATE TRIGGER update_avaliacoes_updated_at
        BEFORE UPDATE ON avaliacoes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pontuacoes_updated_at') THEN
        CREATE TRIGGER update_pontuacoes_updated_at
        BEFORE UPDATE ON pontuacoes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Criar função para calcular a pontuação total de uma avaliação
CREATE OR REPLACE FUNCTION calcular_pontuacao_total()
RETURNS TRIGGER AS $$
DECLARE
  total FLOAT := 0;
  soma_pesos FLOAT := 0;
  criterio_peso FLOAT;
  criterio_record RECORD;
BEGIN
  -- Calcular a pontuação total com base nas pontuações dos critérios
  FOR criterio_record IN
    SELECT p.valor, c.peso
    FROM pontuacoes p
    JOIN criterios c ON p.criterio_id = c.id
    WHERE p.avaliacao_id = NEW.avaliacao_id
  LOOP
    total := total + (criterio_record.valor * criterio_record.peso);
    soma_pesos := soma_pesos + criterio_record.peso;
  END LOOP;

  -- Normalizar a pontuação se houver pesos
  IF soma_pesos > 0 THEN
    total := total / soma_pesos;
  END IF;

  -- Atualizar a pontuação total na avaliação
  UPDATE avaliacoes
  SET pontuacao_total = total, updated_at = NOW()
  WHERE id = NEW.avaliacao_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger para recalcular a pontuação total quando uma pontuação é inserida ou atualizada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calcular_pontuacao_total_insert') THEN
        CREATE TRIGGER calcular_pontuacao_total_insert
        AFTER INSERT ON pontuacoes
        FOR EACH ROW
        EXECUTE FUNCTION calcular_pontuacao_total();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calcular_pontuacao_total_update') THEN
        CREATE TRIGGER calcular_pontuacao_total_update
        AFTER UPDATE ON pontuacoes
        FOR EACH ROW
        EXECUTE FUNCTION calcular_pontuacao_total();
    END IF;
END
$$;

-- Criar políticas de segurança RLS (Row Level Security)
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterios ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontuacoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas para funcionários
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'funcionarios_select') THEN
        CREATE POLICY funcionarios_select ON funcionarios
          FOR SELECT USING (TRUE);  -- Todos podem ver funcionários
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'funcionarios_insert') THEN
        CREATE POLICY funcionarios_insert ON funcionarios
          FOR INSERT WITH CHECK (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'funcionarios_update') THEN
        CREATE POLICY funcionarios_update ON funcionarios
          FOR UPDATE USING (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'funcionarios_delete') THEN
        CREATE POLICY funcionarios_delete ON funcionarios
          FOR DELETE USING (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;
END
$$;

-- Criar políticas para critérios
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'criterios_select') THEN
        CREATE POLICY criterios_select ON criterios
          FOR SELECT USING (TRUE);  -- Todos podem ver critérios
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'criterios_insert') THEN
        CREATE POLICY criterios_insert ON criterios
          FOR INSERT WITH CHECK (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'criterios_update') THEN
        CREATE POLICY criterios_update ON criterios
          FOR UPDATE USING (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'criterios_delete') THEN
        CREATE POLICY criterios_delete ON criterios
          FOR DELETE USING (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;
END
$$;

-- Criar políticas para avaliações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'avaliacoes_select') THEN
        CREATE POLICY avaliacoes_select ON avaliacoes
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
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'avaliacoes_insert') THEN
        CREATE POLICY avaliacoes_insert ON avaliacoes
          FOR INSERT WITH CHECK (
            -- Administradores e gerentes podem criar avaliações
            (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'avaliacoes_update') THEN
        CREATE POLICY avaliacoes_update ON avaliacoes
          FOR UPDATE USING (
            -- Administradores podem atualizar qualquer avaliação
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
            OR
            -- Gerentes podem atualizar avaliações onde são avaliadores
            ((SELECT role FROM users WHERE id = auth.uid()) = 'MANAGER' AND
             avaliador_id IN (SELECT id FROM funcionarios WHERE user_id = auth.uid()))
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'avaliacoes_delete') THEN
        CREATE POLICY avaliacoes_delete ON avaliacoes
          FOR DELETE USING (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;
END
$$;

-- Criar políticas para pontuações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'pontuacoes_select') THEN
        CREATE POLICY pontuacoes_select ON pontuacoes
          FOR SELECT USING (
            -- Administradores podem ver todas as pontuações
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
            OR
            -- Gerentes podem ver pontuações de avaliações onde são avaliadores
            ((SELECT role FROM users WHERE id = auth.uid()) = 'MANAGER' AND
             avaliacao_id IN (SELECT id FROM avaliacoes WHERE avaliador_id IN
                             (SELECT id FROM funcionarios WHERE user_id = auth.uid())))
            OR
            -- Usuários podem ver pontuações de suas próprias avaliações
            avaliacao_id IN (SELECT id FROM avaliacoes WHERE funcionario_id IN
                            (SELECT id FROM funcionarios WHERE user_id = auth.uid()))
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'pontuacoes_insert') THEN
        CREATE POLICY pontuacoes_insert ON pontuacoes
          FOR INSERT WITH CHECK (
            -- Administradores podem inserir qualquer pontuação
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
            OR
            -- Gerentes podem inserir pontuações em avaliações onde são avaliadores
            ((SELECT role FROM users WHERE id = auth.uid()) = 'MANAGER' AND
             avaliacao_id IN (SELECT id FROM avaliacoes WHERE avaliador_id IN
                             (SELECT id FROM funcionarios WHERE user_id = auth.uid())))
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'pontuacoes_update') THEN
        CREATE POLICY pontuacoes_update ON pontuacoes
          FOR UPDATE USING (
            -- Administradores podem atualizar qualquer pontuação
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
            OR
            -- Gerentes podem atualizar pontuações em avaliações onde são avaliadores
            ((SELECT role FROM users WHERE id = auth.uid()) = 'MANAGER' AND
             avaliacao_id IN (SELECT id FROM avaliacoes WHERE avaliador_id IN
                             (SELECT id FROM funcionarios WHERE user_id = auth.uid())))
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'pontuacoes_delete') THEN
        CREATE POLICY pontuacoes_delete ON pontuacoes
          FOR DELETE USING (
            (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
          );
    END IF;
END
$$;

-- Inserir dados iniciais para critérios
INSERT INTO criterios (nome, descricao, categoria, peso, pontuacao_maxima)
VALUES
  ('Conhecimento Técnico', 'Avalia o domínio das tecnologias e ferramentas utilizadas', 'Competências Técnicas', 1.5, 5),
  ('Produtividade', 'Avalia a capacidade de entregar resultados no prazo', 'Desempenho', 1.2, 5),
  ('Trabalho em Equipe', 'Avalia a capacidade de colaborar com os colegas', 'Habilidades Interpessoais', 1.0, 5),
  ('Comunicação', 'Avalia a clareza e eficácia na comunicação', 'Habilidades Interpessoais', 1.0, 5),
  ('Resolução de Problemas', 'Avalia a capacidade de identificar e resolver problemas', 'Competências Técnicas', 1.3, 5)
ON CONFLICT (id) DO NOTHING;
