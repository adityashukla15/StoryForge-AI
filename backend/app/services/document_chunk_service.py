from math import isfinite
from uuid import UUID, uuid4

from app.services.supabase_service import get_supabase_admin_client

from app.core.config import settings


def store_chapter_chunks(
    user_id: str,
    project_id: UUID,
    chapter_id: UUID,
    chunks: list[str],
    embeddings: list[list[float]],
) -> int:
    """
    Atomically replace all indexed chunks for a chapter.
    Ownership is verified inside the PostgreSQL RPC function.
    """

    if len(chunks) != len(embeddings):
        raise ValueError("Chunks and embeddings count must match.")

    payload = []

    for index, (content, embedding) in enumerate(zip(chunks, embeddings)):
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"Chunk {index} cannot be empty.")

        if len(embedding) != settings.EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Chunk {index} must have "
                f"{settings.EMBEDDING_DIMENSIONS} embedding dimensions."
            )

        if any(
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not isfinite(float(value))
            for value in embedding
        ):
            raise ValueError(f"Chunk {index} contains invalid embedding values.")

        vector_string = "[" + ",".join(
            format(float(value), ".9g") for value in embedding
        ) + "]"

        payload.append({
            "id": str(uuid4()),
            "chunk_index": index,
            "content": content,
            "embedding": vector_string,
        })

    client = get_supabase_admin_client()

    response = client.rpc(
        "replace_document_chunks",
        {
            "p_user_id": user_id,
            "p_project_id": str(project_id),
            "p_chapter_id": str(chapter_id),
            "p_chunks": payload,
        },
    ).execute()

    if response.data is None:
        raise RuntimeError("Supabase did not confirm chunk insertion.")

    return int(response.data)
