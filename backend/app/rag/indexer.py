from uuid import UUID

from app.rag.chunker import chunk_text
from app.services.chapter_service import (
    get_chapter,
    verify_project_ownership,
)
from app.services.embedding_service import generate_embeddings
from app.services.document_chunk_service import store_chapter_chunks


def index_chapter(
    user_id: str,
    project_id: UUID,
    chapter_id: UUID,
) -> dict:
    """
    Chunk a chapter, generate embeddings, and store them in Supabase.
    """

    if not verify_project_ownership(user_id, project_id):
        raise PermissionError("Project ownership verification failed.")

    chapter = get_chapter(user_id, chapter_id)

    if not chapter or chapter["project_id"] != str(project_id):
        raise ValueError("Chapter not found in the requested project.")

    content = chapter.get("content", "")

    if not content or not content.strip():
        raise ValueError("Chapter has no content to index.")

    chunks = chunk_text(content)

    if not chunks:
        raise ValueError("No valid text chunks were generated.")

    embeddings = generate_embeddings(chunks)

    stored_count = store_chapter_chunks(
        user_id=user_id,
        project_id=project_id,
        chapter_id=chapter_id,
        chunks=chunks,
        embeddings=embeddings,
    )

    return {
        "chapter_id": str(chapter_id),
        "total_chunks": len(chunks),
        "stored_chunks": stored_count,
        "status": "indexed" if stored_count == len(chunks) else "incomplete",
    }
