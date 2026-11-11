from uuid import uuid4

import pytest

from app.rag.chunker import chunk_text
from app.rag import indexer
from app.services import (
    chat_service,
    document_chunk_service,
    embedding_service,
    retrieval_service,
)
from app.core.config import settings


def test_chunker_handles_empty_and_normalizes_newlines():
    assert chunk_text(" \r\n ") == []
    chunks = chunk_text("First paragraph.\r\n\r\nSecond paragraph.", chunk_size=20, overlap=3)
    assert chunks
    assert all("\r" not in chunk for chunk in chunks)
    assert "First paragraph." in chunks[0]
    assert "Second paragraph." in chunks[-1]


@pytest.mark.parametrize(
    ("chunk_size", "overlap"),
    [(0, 0), (10, -1), (10, 10)],
)
def test_chunker_rejects_invalid_size_and_overlap(chunk_size, overlap):
    with pytest.raises(ValueError):
        chunk_text("Some text", chunk_size=chunk_size, overlap=overlap)


def test_grounded_answer_returns_no_context_without_calling_provider(monkeypatch):
    def unexpected_call():
        raise AssertionError("Gemini must not be called with no retrieved context.")

    monkeypatch.setattr(chat_service, "get_gemini_client", unexpected_call)
    result = chat_service.generate_grounded_answer("Question", [])

    assert result["status"] == "no_context"
    assert result["sources"] == []
    assert "couldn't find relevant information" in result["answer"]


def test_grounded_answer_maps_real_source_metadata_and_provider_response(monkeypatch):
    class FakeModels:
        @staticmethod
        def generate_content(**_kwargs):
            return type("Response", (), {"text": "The map is in the archive [S1]."})()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(chat_service, "get_gemini_client", lambda: FakeClient())
    chunk = {
        "chapter_id": str(uuid4()),
        "chunk_index": 2,
        "chunk_id": str(uuid4()),
        "similarity": 0.87,
        "content": "The map is kept in the archive.",
    }
    result = chat_service.generate_grounded_answer("Where is the map?", [chunk])

    assert result["status"] == "generated"
    assert result["answer"] == "The map is in the archive [S1]."
    assert result["sources"] == [
        {
            "source_id": "S1",
            "chapter_id": chunk["chapter_id"],
            "chunk_index": 2,
            "chunk_id": chunk["chunk_id"],
            "similarity": 0.87,
        }
    ]


def test_indexer_checks_ownership_chapter_and_stores_generated_chunks(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    monkeypatch.setattr(indexer, "verify_project_ownership", lambda *_args: True)
    monkeypatch.setattr(
        indexer,
        "get_chapter",
        lambda *_args: {
            "project_id": str(project_id),
            "content": "A story has enough text to become indexed.",
        },
    )
    monkeypatch.setattr(indexer, "chunk_text", lambda _content: ["first chunk", "second chunk"])
    monkeypatch.setattr(indexer, "generate_embeddings", lambda chunks: [[0.1], [0.2]])
    stored = {}

    def save_chunks(**kwargs):
        stored.update(kwargs)
        return len(kwargs["chunks"])

    monkeypatch.setattr(indexer, "store_chapter_chunks", save_chunks)
    result = indexer.index_chapter(user_id, project_id, chapter_id)

    assert result == {
        "chapter_id": str(chapter_id),
        "total_chunks": 2,
        "stored_chunks": 2,
        "status": "indexed",
    }
    assert stored["chunks"] == ["first chunk", "second chunk"]
    assert stored["user_id"] == user_id


def test_indexer_rejects_wrong_owner_and_project(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    monkeypatch.setattr(indexer, "verify_project_ownership", lambda *_args: False)
    with pytest.raises(PermissionError):
        indexer.index_chapter(user_id, project_id, chapter_id)

    monkeypatch.setattr(indexer, "verify_project_ownership", lambda *_args: True)
    monkeypatch.setattr(
        indexer,
        "get_chapter",
        lambda *_args: {"project_id": str(uuid4()), "content": "Text"},
    )
    with pytest.raises(ValueError, match="Chapter not found"):
        indexer.index_chapter(user_id, project_id, chapter_id)


def test_indexer_marks_empty_chapter_not_applicable_and_clears_old_chunks(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    saved = []
    monkeypatch.setattr(indexer, "verify_project_ownership", lambda *_args: True)
    monkeypatch.setattr(
        indexer,
        "get_chapter",
        lambda *_args: {"project_id": str(project_id), "content": "  "},
    )
    monkeypatch.setattr(
        indexer,
        "store_chapter_chunks",
        lambda **kwargs: saved.append(kwargs) or 0,
    )

    result = indexer.index_chapter(user_id, project_id, chapter_id)

    assert result == {
        "chapter_id": str(chapter_id),
        "total_chunks": 0,
        "stored_chunks": 0,
        "status": "not_applicable",
    }
    assert saved == [{
        "user_id": user_id,
        "project_id": project_id,
        "chapter_id": chapter_id,
        "chunks": [],
        "embeddings": [],
    }]


def test_indexer_reindex_replaces_stale_chunks_without_duplicates(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    chapter = {"project_id": str(project_id), "content": "Old content."}
    stored_chunks = {}
    monkeypatch.setattr(indexer, "verify_project_ownership", lambda *_args: True)
    monkeypatch.setattr(indexer, "get_chapter", lambda *_args: chapter)
    monkeypatch.setattr(indexer, "chunk_text", lambda content: [content])
    monkeypatch.setattr(indexer, "generate_embeddings", lambda chunks: [[0.1] for _ in chunks])

    def replace_chunks(**kwargs):
        stored_chunks[kwargs["chapter_id"]] = list(kwargs["chunks"])
        return len(kwargs["chunks"])

    monkeypatch.setattr(indexer, "store_chapter_chunks", replace_chunks)

    first = indexer.index_chapter(user_id, project_id, chapter_id)
    repeated = indexer.index_chapter(user_id, project_id, chapter_id)
    chapter["content"] = "Updated content."
    updated = indexer.index_chapter(user_id, project_id, chapter_id)

    assert first["status"] == repeated["status"] == updated["status"] == "indexed"
    assert len(stored_chunks) == 1
    assert stored_chunks[chapter_id] == ["Updated content."]


def test_retrieval_uses_replaced_content_for_existing_chapter(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    stored = {"content": "Updated Asterfall facts.", "chunk_id": str(uuid4())}

    class FakeRPC:
        def execute(self):
            return type("Response", (), {"data": [{
                **stored,
                "chapter_id": str(chapter_id),
                "chunk_index": 0,
                "similarity": 0.9,
            }]})()

    class FakeClient:
        def rpc(self, _function_name, _payload):
            return FakeRPC()

    monkeypatch.setattr(
        retrieval_service,
        "generate_embeddings",
        lambda _texts, task_type: [[0.25] * settings.EMBEDDING_DIMENSIONS],
    )
    monkeypatch.setattr(retrieval_service, "get_supabase_admin_client", lambda: FakeClient())

    result = retrieval_service.search_project_chunks(user_id, project_id, "Asterfall facts")

    assert len(result) == 1
    assert result[0]["content"] == "Updated Asterfall facts."
    assert result[0]["chapter_id"] == str(chapter_id)


def test_embedding_input_validation_does_not_call_gemini(monkeypatch):
    def unexpected_client():
        raise AssertionError("Invalid input must be rejected before provider access.")

    monkeypatch.setattr(embedding_service, "get_gemini_client", unexpected_client)
    assert embedding_service.generate_embeddings([]) == []
    with pytest.raises(ValueError, match="empty text"):
        embedding_service.generate_embeddings(["valid", "  "])
    with pytest.raises(ValueError, match="Unsupported"):
        embedding_service.generate_embeddings(["valid"], task_type="UNSUPPORTED")


def test_chunk_storage_rejects_invalid_vectors_before_database_access(monkeypatch):
    def unexpected_client():
        raise AssertionError("Invalid vectors must be rejected before database access.")

    monkeypatch.setattr(document_chunk_service, "get_supabase_admin_client", unexpected_client)
    project_id = uuid4()
    chapter_id = uuid4()

    with pytest.raises(ValueError, match="count must match"):
        document_chunk_service.store_chapter_chunks(
            "user",
            project_id,
            chapter_id,
            ["one"],
            [],
        )

    with pytest.raises(ValueError, match="dimensions"):
        document_chunk_service.store_chapter_chunks(
            "user",
            project_id,
            chapter_id,
            ["one"],
            [[0.1] * (settings.EMBEDDING_DIMENSIONS - 1)],
        )

    with pytest.raises(ValueError, match="invalid embedding"):
        document_chunk_service.store_chapter_chunks(
            "user",
            project_id,
            chapter_id,
            ["one"],
            [[float("nan")] * settings.EMBEDDING_DIMENSIONS],
        )


def test_retrieval_uses_validated_embedding_and_scoped_rpc(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    rpc_calls = []
    expected_chunk = {"chapter_id": str(uuid4()), "chunk_index": 0}

    class FakeRPC:
        def execute(self):
            return type("Response", (), {"data": [expected_chunk]})()

    class FakeClient:
        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))
            return FakeRPC()

    monkeypatch.setattr(
        retrieval_service,
        "generate_embeddings",
        lambda texts, task_type: [[0.25] * settings.EMBEDDING_DIMENSIONS],
    )
    monkeypatch.setattr(
        retrieval_service,
        "get_supabase_admin_client",
        lambda: FakeClient(),
    )

    result = retrieval_service.search_project_chunks(
        user_id,
        project_id,
        "  Where is the key?  ",
        match_count=3,
    )

    assert result == [expected_chunk]
    assert rpc_calls[0][0] == "match_document_chunks"
    assert rpc_calls[0][1]["p_user_id"] == user_id
    assert rpc_calls[0][1]["p_project_id"] == str(project_id)
    assert rpc_calls[0][1]["p_match_count"] == 3
    assert rpc_calls[0][1]["p_query_embedding"].startswith("[0.25,")
    assert rpc_calls[0][1]["p_query_embedding"].endswith("]")


def test_chunk_storage_replaces_chunks_with_ordered_vector_payload(monkeypatch):
    user_id = "00000000-0000-0000-0000-000000000001"
    project_id = uuid4()
    chapter_id = uuid4()
    rpc_calls = []

    class FakeRPC:
        def execute(self):
            return type("Response", (), {"data": 2})()

    class FakeClient:
        def rpc(self, function_name, payload):
            rpc_calls.append((function_name, payload))
            return FakeRPC()

    monkeypatch.setattr(
        document_chunk_service,
        "get_supabase_admin_client",
        lambda: FakeClient(),
    )
    count = document_chunk_service.store_chapter_chunks(
        user_id,
        project_id,
        chapter_id,
        ["first passage", "second passage"],
        [
            [0.1] * settings.EMBEDDING_DIMENSIONS,
            [0.2] * settings.EMBEDDING_DIMENSIONS,
        ],
    )

    assert count == 2
    function_name, payload = rpc_calls[0]
    assert function_name == "replace_document_chunks"
    assert payload["p_user_id"] == user_id
    assert payload["p_project_id"] == str(project_id)
    assert payload["p_chapter_id"] == str(chapter_id)
    assert [chunk["chunk_index"] for chunk in payload["p_chunks"]] == [0, 1]
    assert [chunk["content"] for chunk in payload["p_chunks"]] == [
        "first passage",
        "second passage",
    ]
