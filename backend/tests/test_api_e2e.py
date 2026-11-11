from uuid import UUID, uuid4

from fastapi import HTTPException

from io import BytesIO

from app.routes import chapters, chat
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

USER_ID = "00000000-0000-0000-0000-000000000001"


def test_root_and_health(client):
    root = client.get("/")
    health = client.get("/health")

    assert root.status_code == 200
    assert root.json()["status"] == "running"
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_auth_me_requires_a_valid_bearer_token(client, auth_headers):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid"},
    ).status_code == 401

    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["user"] == {
        "id": USER_ID,
        "email": "storyteller@example.test",
    }


def test_project_crud_and_user_isolation(client, auth_headers):
    created = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={
            "title": "The Glass Kingdom",
            "description": "A testing manuscript",
            "genre": "Fantasy",
        },
    )
    assert created.status_code == 201
    project = created.json()
    project_id = project["id"]
    assert project["user_id"] == USER_ID

    listed = client.get("/api/projects/", headers=auth_headers)
    assert [item["id"] for item in listed.json()] == [project_id]

    details = client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert details.status_code == 200
    assert details.json()["title"] == "The Glass Kingdom"

    updated = client.patch(
        f"/api/projects/{project_id}",
        headers=auth_headers,
        json={"title": "The Glass Kingdom: Revised"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "The Glass Kingdom: Revised"

    assert client.get(f"/api/projects/{project_id}").status_code == 401
    assert client.get(
        f"/api/projects/{project_id}",
        headers={"Authorization": "Bearer test-other"},
    ).status_code == 404
    assert client.delete(
        f"/api/projects/{project_id}",
        headers={"Authorization": "Bearer test-other"},
    ).status_code == 404

    deleted = client.delete(f"/api/projects/{project_id}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["message"] == "Project deleted successfully."
    assert client.get(f"/api/projects/{project_id}", headers=auth_headers).status_code == 404


def test_project_validation(client, auth_headers):
    assert client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "   "},
    ).status_code == 422
    assert client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "x" * 151},
    ).status_code == 422

    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Valid title"},
    ).json()["id"]
    assert client.patch(
        f"/api/projects/{project_id}",
        headers=auth_headers,
        json={},
    ).status_code == 422
    assert client.patch(
        f"/api/projects/{project_id}",
        headers=auth_headers,
        json={"title": None},
    ).status_code == 422
    assert client.get("/api/projects/not-a-uuid", headers=auth_headers).status_code == 422


def test_chapter_crud_and_project_ownership(client, auth_headers, monkeypatch):
    index_calls = []
    monkeypatch.setattr(
        chapters,
        "index_chapter",
        lambda *args: index_calls.append(args) or {"status": "indexed"},
    )
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Chapter test project"},
    ).json()["id"]
    missing_project_id = str(uuid4())
    payload = {
        "title": "Chapter 1",
        "content": "The first page begins here.",
        "chapter_number": 1,
    }

    assert client.post(
        f"/api/projects/{missing_project_id}/chapters",
        headers=auth_headers,
        json=payload,
    ).status_code == 404

    created = client.post(
        f"/api/projects/{project_id}/chapters",
        headers=auth_headers,
        json=payload,
    )
    assert created.status_code == 201
    chapter_id = created.json()["id"]
    assert created.json()["indexing_status"] == "indexed"
    assert index_calls == [(USER_ID, UUID(project_id), UUID(chapter_id))]

    listed = client.get(
        f"/api/projects/{project_id}/chapters",
        headers=auth_headers,
    )
    assert [item["id"] for item in listed.json()] == [chapter_id]
    assert client.get(f"/api/chapters/{chapter_id}", headers=auth_headers).json()["content"] == payload["content"]

    updated = client.patch(
        f"/api/chapters/{chapter_id}",
        headers=auth_headers,
        json={"title": "Revised chapter"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Revised chapter"

    other_headers = {"Authorization": "Bearer test-other"}
    assert client.get(
        f"/api/projects/{project_id}/chapters",
        headers=other_headers,
    ).status_code == 404
    assert client.get(f"/api/chapters/{chapter_id}", headers=other_headers).status_code == 404
    assert client.patch(
        f"/api/chapters/{chapter_id}",
        headers=other_headers,
        json={"title": "Not yours"},
    ).status_code == 404
    initial_index_call_count = len(index_calls)
    unauthorized_content_update = client.patch(
        f"/api/chapters/{chapter_id}",
        headers=other_headers,
        json={"content": "Not yours"},
    )
    assert unauthorized_content_update.status_code == 404
    assert len(index_calls) == initial_index_call_count

    updated_content = client.patch(
        f"/api/chapters/{chapter_id}",
        headers=auth_headers,
        json={"content": "Updated chapter content."},
    )
    assert updated_content.status_code == 200
    assert updated_content.json()["indexing_status"] == "indexed"
    assert index_calls == [
        (USER_ID, UUID(project_id), UUID(chapter_id)),
        (USER_ID, UUID(project_id), UUID(chapter_id)),
    ]

    deleted = client.delete(f"/api/chapters/{chapter_id}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["chapter_id"] == chapter_id
    assert client.get(f"/api/chapters/{chapter_id}", headers=auth_headers).status_code == 404


def test_chapter_validation(client, auth_headers):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Validation project"},
    ).json()["id"]
    endpoint = f"/api/projects/{project_id}/chapters"

    assert client.post(
        endpoint,
        headers=auth_headers,
        json={"title": "Chapter", "content": "", "chapter_number": 1},
    ).status_code == 422
    assert client.post(
        endpoint,
        headers=auth_headers,
        json={"title": "Chapter", "content": "Text", "chapter_number": 0},
    ).status_code == 422
    assert client.patch(
        f"/api/chapters/{uuid4()}",
        headers=auth_headers,
        json={},
    ).status_code == 422


def test_txt_upload_creates_chapter_and_stores_original(client, auth_headers, store, monkeypatch):
    indexed = []
    monkeypatch.setattr(
        chapters,
        "index_chapter",
        lambda *args: indexed.append(args) or {"status": "indexed"},
    )
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Upload project"},
    ).json()["id"]
    response = client.post(
        f"/api/projects/{project_id}/chapters/upload",
        headers=auth_headers,
        data={"title": "Uploaded draft", "chapter_number": "2"},
        files={"file": ("draft.txt", b"\xef\xbb\xbf  A test chapter.  ", "text/plain")},
    )

    assert response.status_code == 201
    chapter = response.json()
    assert chapter["content"] == "A test chapter."
    assert chapter["chapter_number"] == 2
    assert chapter["indexing_status"] == "indexed"
    assert chapter["file_path"] in store.files
    assert store.files[chapter["file_path"]].startswith(b"\xef\xbb\xbf")
    assert indexed == [(USER_ID, UUID(project_id), UUID(chapter["id"]))]


def test_indexing_failure_keeps_created_chapter_and_reports_failed(client, auth_headers, store, monkeypatch):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Index failure project"},
    ).json()["id"]

    def fail_index(*_args):
        raise RuntimeError("private embedding provider detail")

    monkeypatch.setattr(chapters, "index_chapter", fail_index)
    response = client.post(
        f"/api/projects/{project_id}/chapters",
        headers=auth_headers,
        json={"title": "Saved despite indexing failure", "content": "Chapter content."},
    )

    assert response.status_code == 201
    chapter = response.json()
    assert chapter["indexing_status"] == "failed"
    assert chapter["id"] in store.chapters
    assert chapter["content"] == store.chapters[chapter["id"]]["content"]
    assert "private embedding provider detail" not in response.text


def test_upload_indexing_failure_keeps_chapter_and_original_file(client, auth_headers, store, monkeypatch):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Upload indexing failure project"},
    ).json()["id"]

    def fail_index(*_args):
        raise RuntimeError("private embedding provider detail")

    monkeypatch.setattr(chapters, "index_chapter", fail_index)
    response = client.post(
        f"/api/projects/{project_id}/chapters/upload",
        headers=auth_headers,
        data={"title": "Saved upload"},
        files={"file": ("draft.txt", b"Uploaded chapter.", "text/plain")},
    )

    assert response.status_code == 201
    chapter = response.json()
    assert chapter["indexing_status"] == "failed"
    assert chapter["id"] in store.chapters
    assert chapter["file_path"] in store.files
    assert "private embedding provider detail" not in response.text


def test_pdf_upload_extracts_text_and_saves_original(client, auth_headers, store):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "PDF upload project"},
    ).json()["id"]
    writer = PdfWriter()
    page = writer.add_blank_page(width=100, height=100)
    font = DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
    })
    font_reference = writer._add_object(font)
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_reference}),
    })
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 10 50 Td (PDF chapter test) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    buffer = BytesIO()
    writer.write(buffer)

    response = client.post(
        f"/api/projects/{project_id}/chapters/upload",
        headers=auth_headers,
        data={"title": "PDF chapter"},
        files={"file": ("chapter.pdf", buffer.getvalue(), "application/pdf")},
    )

    assert response.status_code == 201
    chapter = response.json()
    assert chapter["content"] == "PDF chapter test"
    assert chapter["file_path"].endswith(".pdf")
    assert store.files[chapter["file_path"]].startswith(b"%PDF-")


def test_upload_rejects_bad_file_and_unknown_project(client, auth_headers):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Upload validation"},
    ).json()["id"]
    endpoint = f"/api/projects/{project_id}/chapters/upload"

    unsupported = client.post(
        endpoint,
        headers=auth_headers,
        data={"title": "Bad extension"},
        files={"file": ("draft.md", b"text", "text/plain")},
    )
    assert unsupported.status_code == 400

    wrong_content_type = client.post(
        endpoint,
        headers=auth_headers,
        data={"title": "Bad type"},
        files={"file": ("draft.txt", b"text", "application/pdf")},
    )
    assert wrong_content_type.status_code == 400

    empty = client.post(
        endpoint,
        headers=auth_headers,
        data={"title": "Empty"},
        files={"file": ("empty.txt", b"", "text/plain")},
    )
    assert empty.status_code == 400

    invalid_utf8 = client.post(
        endpoint,
        headers=auth_headers,
        data={"title": "Invalid encoding"},
        files={"file": ("invalid.txt", b"\xff", "text/plain")},
    )
    assert invalid_utf8.status_code == 400

    too_large = client.post(
        endpoint,
        headers=auth_headers,
        data={"title": "Large"},
        files={"file": ("large.txt", b"x" * (10 * 1024 * 1024 + 1), "text/plain")},
    )
    assert too_large.status_code == 413

    inaccessible = client.post(
        f"/api/projects/{uuid4()}/chapters/upload",
        headers=auth_headers,
        data={"title": "Not owned"},
        files={"file": ("draft.txt", b"text", "text/plain")},
    )
    assert inaccessible.status_code == 404


def test_dashboard_reflects_test_data_and_is_user_scoped(client, auth_headers, store):
    project = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Dashboard project", "genre": "Fantasy"},
    ).json()
    client.post(
        f"/api/projects/{project['id']}/chapters",
        headers=auth_headers,
        json={"title": "One", "content": "Page one.", "chapter_number": 1},
    )
    client.post(
        f"/api/projects/{project['id']}/chat",
        headers=auth_headers,
        json={"question": "What is on page one?"},
    )
    response = client.get("/api/dashboard/overview", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["statistics"] == {
        "total_projects": 1,
        "total_chapters": 1,
        "total_conversations": 1,
        "total_indexed_chunks": 0,
    }
    assert body["recent_projects"][0]["id"] == project["id"]
    assert body["recent_conversations"][0]["project_id"] == project["id"]
    assert len(store.messages) == 2


def test_chat_creates_and_reuses_conversation_and_persists_messages(client, auth_headers, store, monkeypatch):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Chat project"},
    ).json()["id"]
    searched = []
    monkeypatch.setattr(chat, "search_project_chunks", lambda **kwargs: searched.append(kwargs) or [])

    first = client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": "Where is the map?"},
    )
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["status"] == "no_context"
    assert first_body["sources"] == []
    assert len(store.messages) == 2

    second = client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={
            "question": "Who found it?",
            "conversation_id": first_body["conversation_id"],
        },
    )
    assert second.status_code == 200
    assert second.json()["conversation_id"] == first_body["conversation_id"]
    assert len(store.conversations) == 1
    assert len(store.messages) == 4
    assert all(call["match_count"] == 5 for call in searched)


def test_chat_rejects_unknown_project_conversation_and_invalid_questions(client, auth_headers):
    assert client.post(
        f"/api/projects/{uuid4()}/chat",
        headers=auth_headers,
        json={"question": "Question"},
    ).status_code == 404

    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Chat validation"},
    ).json()["id"]
    assert client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": " "},
    ).status_code == 422
    assert client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": "x" * 2001},
    ).status_code == 422

    other_project = client.post(
        "/api/projects/",
        headers={"Authorization": "Bearer test-other"},
        json={"title": "Other user's project"},
    ).json()
    assert client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": "Question", "conversation_id": other_project["id"]},
    ).status_code == 404


def test_chat_returns_sources_from_grounded_answer(client, auth_headers, monkeypatch):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Citations project"},
    ).json()["id"]
    source = {
        "source_id": "S1",
        "chapter_id": str(uuid4()),
        "chunk_index": 0,
        "chunk_id": str(uuid4()),
        "similarity": 0.91,
    }
    monkeypatch.setattr(
        chat,
        "generate_grounded_answer",
        lambda question, retrieved_chunks: {
            "answer": "The lantern is in the archive [S1].",
            "sources": [source],
            "status": "generated",
        },
    )

    response = client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": "Where is the lantern?"},
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "The lantern is in the archive [S1]."
    assert response.json()["sources"] == [source]
    assert response.json()["status"] == "generated"


def test_chat_returns_service_unavailable_without_persisting_partial_turn_or_leaking_errors(
    client,
    auth_headers,
    store,
    monkeypatch,
):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Unavailable provider"},
    ).json()["id"]

    def provider_failure(**_kwargs):
        raise RuntimeError("private provider detail")

    monkeypatch.setattr(chat, "search_project_chunks", provider_failure)
    response = client.post(
        f"/api/projects/{project_id}/chat",
        headers=auth_headers,
        json={"question": "A question"},
    )
    assert response.status_code == 503
    assert "private provider detail" not in response.text
    assert store.conversations == {}
    assert store.messages == {}


def test_conversation_history_listing_order_and_user_isolation(client, auth_headers):
    project = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "History project"},
    ).json()
    first = client.post(
        f"/api/projects/{project['id']}/chat",
        headers=auth_headers,
        json={"question": "First question"},
    ).json()
    client.post(
        f"/api/projects/{project['id']}/chat",
        headers=auth_headers,
        json={"question": "Follow-up", "conversation_id": first["conversation_id"]},
    )

    listed = client.get(
        f"/api/projects/{project['id']}/conversations",
        headers=auth_headers,
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [first["conversation_id"]]

    messages = client.get(
        f"/api/conversations/{first['conversation_id']}/messages",
        headers=auth_headers,
    )
    assert messages.status_code == 200
    assert [item["role"] for item in messages.json()] == [
        "user",
        "assistant",
        "user",
        "assistant",
    ]
    assert messages.json()[0]["content"] == "First question"

    other_headers = {"Authorization": "Bearer test-other"}
    assert client.get(
        f"/api/projects/{project['id']}/conversations",
        headers=other_headers,
    ).status_code == 404
    assert client.get(
        f"/api/conversations/{first['conversation_id']}/messages",
        headers=other_headers,
    ).status_code == 404
    assert client.get(
        f"/api/conversations/{uuid4()}/messages",
        headers=auth_headers,
    ).status_code == 404


def test_chat_does_not_accept_cross_user_conversation(client, auth_headers):
    first_project = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "First project"},
    ).json()
    conversation_id = client.post(
        f"/api/projects/{first_project['id']}/chat",
        headers=auth_headers,
        json={"question": "Start"},
    ).json()["conversation_id"]
    second_project = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Second project"},
    ).json()

    response = client.post(
        f"/api/projects/{second_project['id']}/chat",
        headers=auth_headers,
        json={"question": "Reuse wrong project", "conversation_id": conversation_id},
    )
    assert response.status_code == 404


def test_chapter_upload_cleans_up_file_when_database_insert_fails(client, auth_headers, store, monkeypatch):
    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Rollback project"},
    ).json()["id"]

    def fail_insert(*_args, **_kwargs):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(chapters.chapter_service, "create_chapter", fail_insert)
    response = client.post(
        f"/api/projects/{project_id}/chapters/upload",
        headers=auth_headers,
        data={"title": "Rollback test"},
        files={"file": ("draft.txt", b"Testing rollback.", "text/plain")},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Unable to upload chapter. Please try again."
    assert store.files == {}
