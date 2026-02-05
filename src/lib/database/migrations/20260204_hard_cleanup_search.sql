-- HARD CLEANUP: Drop ALL variants found in pg_proc
DROP FUNCTION IF EXISTS public.search_globally(TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.search_globally(TEXT, INT, INT, TEXT); -- The culprit

-- RE-CREATE the official boosted version
CREATE OR REPLACE FUNCTION public.search_globally(
    query_text TEXT,
    limit_val INT DEFAULT 10,
    offset_val INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    original_id TEXT,
    source_table TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    metadata JSONB,
    rank REAL,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_rows BIGINT;
BEGIN
    -- 1. Get total count for pagination
    SELECT COUNT(*) INTO total_rows
    FROM public.global_search_index
    WHERE 
        search_vector @@ websearch_to_tsquery('portuguese', query_text)
        OR title ILIKE '%' || query_text || '%'
        OR content ILIKE '%' || query_text || '%';

    -- 2. Return results with Ranking Boost
    RETURN QUERY
    SELECT 
        gsi.id,
        gsi.original_id,
        gsi.source_table,
        gsi.title,
        gsi.content,
        gsi.url,
        gsi.metadata,
        (
            ts_rank(gsi.search_vector, websearch_to_tsquery('portuguese', query_text)) + 
            -- BOOST System Pages significantly (ADD 2.0 to rank)
            CASE WHEN gsi.source_table = 'system_pages' THEN 2.0 ELSE 0 END +
            -- Small boost for title matches
            CASE WHEN gsi.title ILIKE '%' || query_text || '%' THEN 0.5 ELSE 0 END
        )::REAL AS rank,
        total_rows
    FROM public.global_search_index gsi
    WHERE 
        gsi.search_vector @@ websearch_to_tsquery('portuguese', query_text)
        OR gsi.title ILIKE '%' || query_text || '%'
        OR gsi.content ILIKE '%' || query_text || '%'
    ORDER BY rank DESC
    LIMIT limit_val OFFSET offset_val;
END;
$$;
