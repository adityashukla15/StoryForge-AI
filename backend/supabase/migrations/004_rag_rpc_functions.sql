
-- =========================================================
-- MIGRATION 004: RAG RPC FUNCTIONS
-- =========================================================

-- Replace chapter chunks atomically.
CREATE OR REPLACE FUNCTION public.replace_document_chunks(
    p_user_id UUID,
    p_project_id UUID,
    p_chapter_id UUID,
    p_chunks JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
DECLARE
    inserted_count INTEGER;
BEGIN
    -- Verify chapter ownership.
    IF NOT EXISTS (
        SELECT 1
        FROM public.chapters
        WHERE id = p_chapter_id
          AND project_id = p_project_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Chapter ownership verification failed'
            USING ERRCODE = '42501';
    END IF;

    -- Reject NULL and non-array inputs.
    IF p_chunks IS NULL
       OR jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Chunks must be a JSON array';
    END IF;

    -- Remove previous chunks for this chapter.
    DELETE FROM public.document_chunks
    WHERE chapter_id = p_chapter_id
      AND project_id = p_project_id
      AND user_id = p_user_id;

    -- Insert replacement chunks.
    INSERT INTO public.document_chunks (
        id,
        project_id,
        chapter_id,
        user_id,
        chunk_index,
        content,
        embedding
    )
    SELECT
        (chunk->>'id')::UUID,
        p_project_id,
        p_chapter_id,
        p_user_id,
        (chunk->>'chunk_index')::INTEGER,
        chunk->>'content',
        (chunk->>'embedding')::extensions.vector(768)
    FROM jsonb_array_elements(p_chunks) AS chunk;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN inserted_count;
END;
$function$;


-- Retrieve semantically similar project chunks.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    p_user_id UUID,
    p_project_id UUID,
    p_query_embedding extensions.vector,
    p_match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    chapter_id UUID,
    chunk_index INTEGER,
    content TEXT,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
    -- Reject NULL and out-of-range result counts.
    IF p_match_count IS NULL
       OR p_match_count < 1
       OR p_match_count > 20 THEN
        RAISE EXCEPTION 'Match count must be between 1 and 20';
    END IF;

    -- Verify project ownership.
    IF NOT EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_project_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Project ownership verification failed'
            USING ERRCODE = '42501';
    END IF;

    -- Find the most semantically similar chunks.
    RETURN QUERY
    SELECT
        dc.id,
        dc.chapter_id,
        dc.chunk_index,
        dc.content,
        (1 - (dc.embedding <=> p_query_embedding))::DOUBLE PRECISION
    FROM public.document_chunks AS dc
    WHERE dc.project_id = p_project_id
      AND dc.user_id = p_user_id
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$function$;


-- Restrict execution to the backend service role.
REVOKE ALL ON FUNCTION public.replace_document_chunks(
    UUID, UUID, UUID, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_document_chunks(
    UUID, UUID, UUID, JSONB
) TO service_role;


REVOKE ALL ON FUNCTION public.match_document_chunks(
    UUID, UUID, extensions.vector, INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_document_chunks(
    UUID, UUID, extensions.vector, INTEGER
) TO service_role;
 