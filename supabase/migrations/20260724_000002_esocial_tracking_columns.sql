-- Add tracking columns to gt_colaboradores for all e-Social event types

ALTER TABLE IF EXISTS gt_colaboradores
ADD COLUMN IF NOT EXISTS esocial_admissao_status TEXT CHECK (esocial_admissao_status IN ('nao_enviado', 'pendente', 'pendente_revisao', 'enviado', 'processado', 'erro', 'erro_validacao')),
ADD COLUMN IF NOT EXISTS esocial_admissao_evento_id UUID,
ADD COLUMN IF NOT EXISTS esocial_cadastro_status TEXT CHECK (esocial_cadastro_status IN ('nao_enviado', 'pendente', 'pendente_revisao', 'enviado', 'processado', 'erro', 'erro_validacao')),
ADD COLUMN IF NOT EXISTS esocial_cadastro_evento_id UUID,
ADD COLUMN IF NOT EXISTS esocial_contrato_status TEXT CHECK (esocial_contrato_status IN ('nao_enviado', 'pendente', 'pendente_revisao', 'enviado', 'processado', 'erro', 'erro_validacao')),
ADD COLUMN IF NOT EXISTS esocial_contrato_evento_id UUID,
ADD COLUMN IF NOT EXISTS esocial_risco_status TEXT CHECK (esocial_risco_status IN ('nao_enviado', 'pendente', 'pendente_revisao', 'enviado', 'processado', 'erro', 'erro_validacao')),
ADD COLUMN IF NOT EXISTS esocial_risco_evento_id UUID,
ADD COLUMN IF NOT EXISTS esocial_desligamento_status TEXT CHECK (esocial_desligamento_status IN ('nao_enviado', 'pendente', 'pendente_revisao', 'enviado', 'processado', 'erro', 'erro_validacao')),
ADD COLUMN IF NOT EXISTS esocial_desligamento_evento_id UUID;

-- Backfill S-2200 (Admissão)
UPDATE gt_colaboradores c
SET 
  esocial_admissao_status = CASE 
    WHEN latest_event.status IN ('rascunho', 'devolvido', 'revisao_rejeitado') THEN 'erro_validacao'
    WHEN latest_event.status = 'erro' THEN 'erro'
    WHEN latest_event.status IN ('processado') THEN 'processado'
    WHEN latest_event.status IN ('enviado', 'enviando', 'fila_envio') THEN 'enviado'
    WHEN latest_event.status IN ('pendente_revisao', 'revisao_aprovado') THEN 'pendente_revisao'
    ELSE 'pendente' 
  END,
  esocial_admissao_evento_id = latest_event.id
FROM (
  SELECT cpf_trabalhador AS cpf, status, id
  FROM esocial_eventos e1
  WHERE evento_codigo = 'S-2200'
  AND created_at = (
    SELECT MAX(created_at)
    FROM esocial_eventos e2
    WHERE e2.evento_codigo = 'S-2200' AND e2.cpf_trabalhador = e1.cpf_trabalhador
  )
) latest_event
WHERE regexp_replace(c.cpf, '[^0-9]', '', 'g') = regexp_replace(latest_event.cpf, '[^0-9]', '', 'g');

-- Backfill S-2240 (Risco)
UPDATE gt_colaboradores c
SET 
  esocial_risco_status = CASE 
    WHEN latest_event.status IN ('rascunho', 'devolvido', 'revisao_rejeitado') THEN 'erro_validacao'
    WHEN latest_event.status = 'erro' THEN 'erro'
    WHEN latest_event.status IN ('processado') THEN 'processado'
    WHEN latest_event.status IN ('enviado', 'enviando', 'fila_envio') THEN 'enviado'
    WHEN latest_event.status IN ('pendente_revisao', 'revisao_aprovado') THEN 'pendente_revisao'
    ELSE 'pendente' 
  END,
  esocial_risco_evento_id = latest_event.id
FROM (
  SELECT cpf_trabalhador AS cpf, status, id
  FROM esocial_eventos e1
  WHERE evento_codigo = 'S-2240'
  AND created_at = (
    SELECT MAX(created_at)
    FROM esocial_eventos e2
    WHERE e2.evento_codigo = 'S-2240' AND e2.cpf_trabalhador = e1.cpf_trabalhador
  )
) latest_event
WHERE regexp_replace(c.cpf, '[^0-9]', '', 'g') = regexp_replace(latest_event.cpf, '[^0-9]', '', 'g');
