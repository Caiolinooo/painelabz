-- Script para corrigir a view vw_avaliacoes_desempenho

-- Primeiro, vamos verificar se a view existe e removê-la
DROP VIEW IF EXISTS vw_avaliacoes_desempenho;

-- Agora, vamos criar a view novamente com a definição correta
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

-- Criar uma view alternativa para avaliacoes_desempenho se essa tabela existir
DROP VIEW IF EXISTS vw_avaliacoes_desempenho_alt;

CREATE OR REPLACE VIEW vw_avaliacoes_desempenho_alt AS
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
  f_func.nome AS funcionario_nome,
  f_func.cargo AS funcionario_cargo,
  f_func.departamento AS funcionario_departamento,
  f_func.email AS funcionario_email,
  f_aval.nome AS avaliador_nome,
  f_aval.cargo AS avaliador_cargo,
  f_aval.email AS avaliador_email
FROM 
  avaliacoes_desempenho a
  LEFT JOIN funcionarios f_func ON a.funcionario_id = f_func.id
  LEFT JOIN funcionarios f_aval ON a.avaliador_id = f_aval.id
WHERE 
  a.deleted_at IS NULL;

-- Conceder permissões para a view alternativa
GRANT SELECT ON vw_avaliacoes_desempenho_alt TO authenticated;
GRANT SELECT ON vw_avaliacoes_desempenho_alt TO anon;
GRANT SELECT ON vw_avaliacoes_desempenho_alt TO service_role;
