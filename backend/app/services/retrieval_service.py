from math import isfinite
from uuid import UUID

from app.core.config import settings
from app.services.embedding_service import generate_embeddings
from app.services.supabase_service import get_supabase_admin_client


def search_project_chunks(
    user_id: str,
    project_id: UUID,
    query: str,
    match_count: int = 5,
) -> list[dict]:
    """
    Search relevant chapter chunks using semantic similarity.
    """

    if not query or not query.strip():
        raise ValueError("Search query cannot be empty.")

    if not 1 <= match_count <= 20:
        raise ValueError("Match count must be between 1 and 20.")

    # Convert the user's question into a query embedding.
    embeddings = generate_embeddings(
        [query.strip()],
        task_type="RETRIEVAL_QUERY",
    )

    query_embedding = embeddings[0]

    if len(query_embedding) != settings.EMBEDDING_DIMENSIONS:
        raise RuntimeError("Unexpected query embedding dimensions.")

    if any(not isfinite(float(value)) for value in query_embedding):
        raise RuntimeError("Query embedding contains invalid values.")

    # Convert embedding to PostgreSQL vector format.
    vector_string = "[" + ",".join(
        format(float(value), ".9g")
        for value in query_embedding
    ) + "]"

    # Call Supabase semantic search RPC.
    client = get_supabase_admin_client()

    response = client.rpc(
        "match_document_chunks",
        {
            "p_user_id": user_id,
            "p_project_id": str(project_id),
            "p_query_embedding": vector_string,
            "p_match_count": match_count,
        },
    ).execute()

    if response.data is None:
        raise RuntimeError("Supabase returned no search response.")

    return response.data