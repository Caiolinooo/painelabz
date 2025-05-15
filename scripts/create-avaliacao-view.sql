-- Script para criar uma view para as avaliações de desempenho
-- Esta view combina dados das tabelas avaliacoes, funcionarios e pontuacoes

-- Criar a view vw_avaliacoes_desempenho
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
  f_func.nome AS funcionario_nome,
  f_func.cargo AS funcionario_cargo,
  f_func.departamento AS funcionario_departamento,
  f_aval.nome AS avaliador_nome,
  f_aval.cargo AS avaliador_cargo
FROM 
  avaliacoes a
  JOIN funcionarios f_func ON a.funcionario_id = f_func.id
  JOIN funcionarios f_aval ON a.avaliador_id = f_aval.id
WHERE 
  a.deleted_at IS NULL;

-- Criar uma função para atualizar a view quando houver alterações nas tabelas relacionadas
CREATE OR REPLACE FUNCTION refresh_avaliacoes_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar a view (não é necessário para views não materializadas, mas mantido para referência)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar a view quando houver alterações nas tabelas relacionadas
DO $$
BEGIN
  -- Remover triggers existentes para evitar duplicação
  DROP TRIGGER IF EXISTS refresh_avaliacoes_view_avaliacoes ON avaliacoes;
  DROP TRIGGER IF EXISTS refresh_avaliacoes_view_funcionarios ON funcionarios;
  
  -- Criar novos triggers
  CREATE TRIGGER refresh_avaliacoes_view_avaliacoes
  AFTER INSERT OR UPDATE OR DELETE ON avaliacoes
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_avaliacoes_view();
  
  CREATE TRIGGER refresh_avaliacoes_view_funcionarios
  AFTER UPDATE ON funcionarios
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_avaliacoes_view();
END
$$;

-- Conceder permissões para a view
GRANT SELECT ON vw_avaliacoes_desempenho TO authenticated;
GRANT SELECT ON vw_avaliacoes_desempenho TO anon;
GRANT SELECT ON vw_avaliacoes_desempenho TO service_role;
