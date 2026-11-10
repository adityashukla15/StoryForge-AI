from functools import lru_cache

from google import genai
from google.genai import types

from app.core.config import settings


@lru_cache(maxsize=1)
def get_gemini_client():
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_embeddings(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    """
    Generate embeddings for document chunks or search queries.
    """

    if not texts:
        return []

    if any(not text.strip() for text in texts):
        raise ValueError("Embedding input cannot contain empty text.")

    allowed_tasks = {
        "RETRIEVAL_DOCUMENT",
        "RETRIEVAL_QUERY",
    }

    if task_type not in allowed_tasks:
        raise ValueError("Unsupported embedding task type.")

    client = get_gemini_client()

    response = client.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=settings.EMBEDDING_DIMENSIONS,
        ),
    )

    if not response.embeddings:
        raise RuntimeError("Gemini returned no embeddings.")

    embeddings = [
        embedding.values
        for embedding in response.embeddings
    ]

    if len(embeddings) != len(texts):
        raise RuntimeError(
            "Gemini returned an unexpected number of embeddings."
        )

    for embedding in embeddings:
        if len(embedding) != settings.EMBEDDING_DIMENSIONS:
            raise RuntimeError(
                "Gemini returned an unexpected embedding dimension."
            )

    return embeddings