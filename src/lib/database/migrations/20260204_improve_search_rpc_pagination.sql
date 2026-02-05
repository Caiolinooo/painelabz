-- Update search_globally to include total_count
DROP FUNCTION IF EXISTS public.search_globally;

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
    updated_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
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
        g.updated_at,
        COUNT(*) OVER() as total_count
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
