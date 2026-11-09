
-- =========================================================
-- STORYFORGE AI
-- Migration: 003_storage
-- =========================================================

-- Create private chapter storage bucket
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'story-chapters',
    'story-chapters',
    FALSE,
    10485760,
    ARRAY[
        'application/pdf',
        'text/plain'
    ]::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

-- Users can view files belonging to their own projects
CREATE POLICY "Users can read own chapter files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'story-chapters'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::TEXT = (storage.foldername(name))[2]
        AND p.user_id = (SELECT auth.uid())
    )
);

-- Users can upload files to their own projects
CREATE POLICY "Users can upload own chapter files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'story-chapters'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::TEXT = (storage.foldername(name))[2]
        AND p.user_id = (SELECT auth.uid())
    )
);

-- Users can update files belonging to their projects
CREATE POLICY "Users can update own chapter files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'story-chapters'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::TEXT = (storage.foldername(name))[2]
        AND p.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'story-chapters'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::TEXT = (storage.foldername(name))[2]
        AND p.user_id = (SELECT auth.uid())
    )
);

-- Users can delete files belonging to their projects
CREATE POLICY "Users can delete own chapter files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'story-chapters'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::TEXT = (storage.foldername(name))[2]
        AND p.user_id = (SELECT auth.uid())
    )
);
