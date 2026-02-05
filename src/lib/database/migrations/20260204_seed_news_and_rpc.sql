-- Seed News table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public."News") THEN
        INSERT INTO public."News" (id, title, description, content, author, date, "createdAt", "updatedAt", enabled, featured, category)
        VALUES 
        (gen_random_uuid()::text, 'Treinamento de QHSE', 'Treinamento obrigatório para todos os colaboradores.', 'Convocação para treinamento obrigatório de Qualidade, Saúde, Segurança e Meio Ambiente (QHSE).', 'RH', NOW(), NOW(), NOW(), true, true, 'Treinamentos'),
        (gen_random_uuid()::text, 'Reunião Geral de Resultados', 'Apresentação trimestral.', 'Apresentação dos resultados do último trimestre com a diretoria.', 'Diretoria', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', true, false, 'Eventos'),
        (gen_random_uuid()::text, 'Novo Benefício: Gympass', 'Acesso liberado ao Gympass.', 'Agora todos os colaboradores têm acesso ao Gympass. Saiba como ativar.', 'RH', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', true, true, 'Benefícios'),
        (gen_random_uuid()::text, 'Comunicado: Manutenção no Sistema', 'Manutenção programada.', 'O sistema passará por manutenção programada neste sábado.', 'TI', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', true, false, 'Avisos');
    END IF;
END $$;

-- Enable Partial/Substring matching via RPC
CREATE OR REPLACE FUNCTION public.search_globally(
    query_text TEXT, 
    limit_val INT DEFAULT 20, 
    offset_val INT DEFAULT 0,
    type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    original_id TEXT,
    source_table TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.original_id,
        g.source_table,
        g.title,
        g.content,
        g.url,
        g.metadata,
        g.created_at,
        g.updated_at
    FROM public.global_search_index g
    WHERE 
        (
            g.search_vector @@ websearch_to_tsquery('portuguese', query_text)
            OR
            g.title ILIKE '%' || query_text || '%'
            OR
            g.content ILIKE '%' || query_text || '%'
        )
        AND (type_filter IS NULL OR type_filter = 'all' OR g.source_table = type_filter)
    ORDER BY 
        ts_rank(g.search_vector, websearch_to_tsquery('portuguese', query_text)) DESC,
        g.updated_at DESC
    LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Refresh index to include new news
SELECT public.refresh_global_search_index();
