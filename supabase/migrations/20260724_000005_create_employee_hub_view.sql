-- Create view vw_employee_hub

CREATE OR REPLACE VIEW vw_employee_hub AS
SELECT
    c.*,
    
    -- Documents count
    COALESCE(docs.total_documentos, 0) as total_documentos,
    COALESCE(docs.docs_identificacao, 0) as docs_identificacao,
    COALESCE(docs.docs_aso, 0) as docs_aso,
    COALESCE(docs.docs_treinamento, 0) as docs_treinamento,
    
    -- Latest ASO
    aso.data_exame as aso_ultimo_exame,
    aso.validade as aso_validade,
    aso.resultado as aso_resultado,
    aso.tipo_exame as aso_tipo,
    
    -- Latest embarque
    emb.data_embarque as ultimo_embarque_data,
    emb.local_embarque as ultimo_embarque_local,
    
    -- e-Social event counts
    COALESCE(es.esocial_pendentes, 0) as esocial_pendentes,
    COALESCE(es.esocial_processados, 0) as esocial_processados,
    COALESCE(es.esocial_erros, 0) as esocial_erros,
    
    -- Afastamentos
    COALESCE(af.afastamentos_ativos, 0) as afastamentos_ativos,
    
    -- Acidentes
    COALESCE(ac.total_acidentes, 0) as total_acidentes

FROM gt_colaboradores c

LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_documentos,
        SUM(CASE WHEN d.tipo = 'identificacao' THEN 1 ELSE 0 END) as docs_identificacao,
        SUM(CASE WHEN d.tipo = 'aso' THEN 1 ELSE 0 END) as docs_aso,
        SUM(CASE WHEN d.tipo = 'treinamento' THEN 1 ELSE 0 END) as docs_treinamento
    FROM gt_documentos d 
    WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL
) docs ON true

LEFT JOIN LATERAL (
    SELECT a.data_exame, a.validade, a.resultado, a.tipo_exame
    FROM gt_documentos_aso a
    WHERE a.colaborador_id = c.id
    ORDER BY a.data_exame DESC NULLS LAST
    LIMIT 1
) aso ON true

LEFT JOIN LATERAL (
    SELECT he.data_embarque, he.local_embarque
    FROM gt_historico_embarques he
    WHERE he.colaborador_id = c.id AND he.deleted_at IS NULL
    ORDER BY he.data_embarque DESC NULLS LAST
    LIMIT 1
) emb ON true

LEFT JOIN LATERAL (
    SELECT 
        SUM(CASE WHEN e.status IN ('pendente', 'fila_envio', 'enviando', 'pendente_revisao') THEN 1 ELSE 0 END) as esocial_pendentes,
        SUM(CASE WHEN e.status = 'processado' THEN 1 ELSE 0 END) as esocial_processados,
        SUM(CASE WHEN e.status IN ('erro', 'devolvido', 'erro_validacao', 'rascunho', 'revisao_rejeitado') THEN 1 ELSE 0 END) as esocial_erros
    FROM esocial_eventos e 
    WHERE regexp_replace(e.cpf_trabalhador, '[^0-9]', '', 'g') = regexp_replace(c.cpf, '[^0-9]', '', 'g')
) es ON true

LEFT JOIN LATERAL (
    SELECT count(*) as afastamentos_ativos 
    FROM gt_afastamentos afst 
    WHERE afst.colaborador_id = c.id AND afst.deleted_at IS NULL AND (afst.data_fim IS NULL OR afst.data_fim >= CURRENT_DATE)
) af ON true

LEFT JOIN LATERAL (
    SELECT count(*) as total_acidentes 
    FROM gt_acidentes act 
    WHERE act.colaborador_id = c.id AND act.deleted_at IS NULL
) ac ON true;
