
-- =========================================================
-- STORYFORGE AI
-- Migration: 002_initial_schema
-- PostgreSQL + Supabase + pgvector
-- =========================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    description TEXT,
    genre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, user_id)
);

-- 3. CHAPTERS
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    content TEXT NOT NULL DEFAULT '',
    file_path TEXT,
    chapter_number INTEGER CHECK (
        chapter_number IS NULL OR chapter_number > 0
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chapters_project_owner_fk
        FOREIGN KEY (project_id, user_id)
        REFERENCES public.projects(id, user_id)
        ON DELETE CASCADE,

    CONSTRAINT chapters_project_number_unique
        UNIQUE (project_id, chapter_number),

    UNIQUE (id, project_id, user_id)
);

-- 4. DOCUMENT CHUNKS
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    chapter_id UUID NOT NULL,
    user_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    embedding extensions.vector(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chunks_project_owner_fk
        FOREIGN KEY (project_id, user_id)
        REFERENCES public.projects(id, user_id)
        ON DELETE CASCADE,

    CONSTRAINT chunks_chapter_owner_fk
        FOREIGN KEY (chapter_id, project_id, user_id)
        REFERENCES public.chapters(id, project_id, user_id)
        ON DELETE CASCADE,

    UNIQUE (chapter_id, chunk_index)
);

-- 5. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_project_owner_fk
        FOREIGN KEY (project_id, user_id)
        REFERENCES public.projects(id, user_id)
        ON DELETE CASCADE,

    UNIQUE (id, user_id)
);

-- 6. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN ('user', 'assistant', 'system')
    ),
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_conversation_owner_fk
        FOREIGN KEY (conversation_id, user_id)
        REFERENCES public.conversations(id, user_id)
        ON DELETE CASCADE
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id
    ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at
    ON public.projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapters_project_id
    ON public.chapters(project_id);

CREATE INDEX IF NOT EXISTS idx_chapters_user_id
    ON public.chapters(user_id);

CREATE INDEX IF NOT EXISTS idx_chunks_project_id
    ON public.document_chunks(project_id);

CREATE INDEX IF NOT EXISTS idx_chunks_chapter_id
    ON public.document_chunks(chapter_id);

CREATE INDEX IF NOT EXISTS idx_chunks_user_id
    ON public.document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
    ON public.document_chunks
    USING hnsw (embedding extensions.vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_conversations_project_id
    ON public.conversations(project_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
    ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON public.messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_user_id
    ON public.messages(user_id);

-- =========================================================
-- AUTOMATIC UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- AUTOMATIC PROFILE CREATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name'
        )
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- PROJECTS
CREATE POLICY "Users can manage own projects"
ON public.projects FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- CHAPTERS
CREATE POLICY "Users can manage own chapters"
ON public.chapters FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- DOCUMENT CHUNKS
-- Users can read their own chunks.
-- Writes are reserved for the authorized backend ingestion service.

CREATE POLICY "Users can read own document chunks"
ON public.document_chunks FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- CONVERSATIONS
CREATE POLICY "Users can manage own conversations"
ON public.conversations FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- MESSAGES
CREATE POLICY "Users can read own messages"
ON public.messages FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'user'
);

CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- =========================================================
-- END OF MIGRATION
-- =========================================================
-- Explicit permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, UPDATE
ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.projects, public.chapters, public.conversations
TO authenticated;

GRANT SELECT
ON public.document_chunks TO authenticated;

GRANT SELECT, INSERT, DELETE
ON public.messages TO authenticated;
