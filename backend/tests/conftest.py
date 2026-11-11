from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi import Header, HTTPException
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.routes import chapters, chat, conversations, dashboard, projects


USER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000002"


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class TestStore:
    projects: dict[str, dict] = field(default_factory=dict)
    chapters: dict[str, dict] = field(default_factory=dict)
    conversations: dict[str, dict] = field(default_factory=dict)
    messages: dict[str, dict] = field(default_factory=dict)
    files: dict[str, bytes] = field(default_factory=dict)

    def create_project(self, user_id: str, data: dict) -> dict:
        project_id = str(uuid4())
        now = timestamp()
        project = {
            "id": project_id,
            "user_id": user_id,
            **data,
            "created_at": now,
            "updated_at": now,
        }
        self.projects[project_id] = project
        return project

    def create_chapter(self, user_id: str, project_id: UUID, data: dict) -> dict:
        chapter_id = str(data.get("id") or uuid4())
        now = timestamp()
        chapter = {
            "id": chapter_id,
            "project_id": str(project_id),
            "user_id": user_id,
            "title": data["title"],
            "content": data["content"],
            "chapter_number": data.get("chapter_number"),
            "file_path": data.get("file_path"),
            "created_at": now,
            "updated_at": now,
        }
        self.chapters[chapter_id] = chapter
        return chapter

    def create_conversation(self, user_id: str, project_id: UUID) -> dict:
        conversation_id = str(uuid4())
        conversation = {
            "id": conversation_id,
            "project_id": str(project_id),
            "user_id": user_id,
            "created_at": timestamp(),
        }
        self.conversations[conversation_id] = conversation
        return conversation

    def create_message(
        self,
        user_id: str,
        conversation_id: UUID,
        role: str,
        content: str,
        sources: list[dict] | None = None,
    ) -> dict:
        message = {
            "id": str(uuid4()),
            "conversation_id": str(conversation_id),
            "user_id": user_id,
            "role": role,
            "content": content,
            "sources": sources or [],
            "created_at": timestamp(),
        }
        self.messages[message["id"]] = message
        return message


@pytest.fixture
def store() -> TestStore:
    return TestStore()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, store: TestStore) -> TestClient:
    def authenticate(authorization: str | None = Header(default=None)) -> dict:
        if authorization == "Bearer test-user":
            return {"id": USER_ID, "email": "storyteller@example.test"}
        if authorization == "Bearer test-other":
            return {"id": OTHER_USER_ID, "email": "other@example.test"}
        from fastapi import Header, HTTPException

        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = authenticate

    monkeypatch.setattr(projects.project_service, "create_project", store.create_project)
    monkeypatch.setattr(
        projects.project_service,
        "list_projects",
        lambda user_id: [
            item
            for item in store.projects.values()
            if item["user_id"] == user_id
        ],
    )
    monkeypatch.setattr(
        projects.project_service,
        "get_project",
        lambda user_id, project_id: (
            item
            if (item := store.projects.get(str(project_id)))
            and item["user_id"] == user_id
            else None
        ),
    )

    def update_project(user_id: str, project_id: UUID, data: dict) -> dict | None:
        item = store.projects.get(str(project_id))
        if not item or item["user_id"] != user_id:
            return None
        item.update(data)
        item["updated_at"] = timestamp()
        return item

    def delete_project(user_id: str, project_id: UUID) -> bool:
        item = store.projects.get(str(project_id))
        if not item or item["user_id"] != user_id:
            return False
        del store.projects[str(project_id)]
        return True

    monkeypatch.setattr(projects.project_service, "update_project", update_project)
    monkeypatch.setattr(projects.project_service, "delete_project", delete_project)

    def owns_project(user_id: str, project_id: UUID) -> bool:
        item = store.projects.get(str(project_id))
        return bool(item and item["user_id"] == user_id)

    monkeypatch.setattr(chapters.chapter_service, "verify_project_ownership", owns_project)
    monkeypatch.setattr(chapters.chapter_service, "create_chapter", store.create_chapter)
    monkeypatch.setattr(
        chapters,
        "index_chapter",
        lambda user_id, project_id, chapter_id: {
            "chapter_id": str(chapter_id),
            "total_chunks": 1,
            "stored_chunks": 1,
            "status": "indexed",
        },
    )
    monkeypatch.setattr(
        chapters.chapter_service,
        "list_chapters",
        lambda user_id, project_id: sorted(
            (
                item
                for item in store.chapters.values()
                if item["user_id"] == user_id
                and item["project_id"] == str(project_id)
            ),
            key=lambda item: (
                item["chapter_number"] is None,
                item["chapter_number"] or 0,
                item["created_at"],
            ),
        ),
    )
    monkeypatch.setattr(
        chapters.chapter_service,
        "get_chapter",
        lambda user_id, chapter_id: (
            item
            if (item := store.chapters.get(str(chapter_id)))
            and item["user_id"] == user_id
            else None
        ),
    )

    def update_chapter(user_id: str, chapter_id: UUID, data: dict) -> dict | None:
        item = store.chapters.get(str(chapter_id))
        if not item or item["user_id"] != user_id:
            return None
        item.update(data)
        item["updated_at"] = timestamp()
        return item

    def delete_chapter(user_id: str, chapter_id: UUID) -> dict | None:
        item = store.chapters.get(str(chapter_id))
        if not item or item["user_id"] != user_id:
            return None
        return store.chapters.pop(str(chapter_id))

    monkeypatch.setattr(chapters.chapter_service, "update_chapter", update_chapter)
    monkeypatch.setattr(chapters.chapter_service, "delete_chapter", delete_chapter)

    def upload_file(
        user_id: str,
        project_id: UUID,
        chapter_id: UUID,
        file_bytes: bytes,
        extension: str,
    ) -> str:
        path = f"{user_id}/{project_id}/{chapter_id}{extension}"
        store.files[path] = file_bytes
        return path

    monkeypatch.setattr(chapters.chapter_service, "upload_chapter_file", upload_file)
    monkeypatch.setattr(
        chapters.chapter_service,
        "delete_chapter_file",
        lambda file_path: store.files.pop(file_path, None),
    )

    monkeypatch.setattr(
        conversations.chapter_service,
        "verify_project_ownership",
        owns_project,
    )
    monkeypatch.setattr(
        conversations.conversation_service,
        "list_conversations",
        lambda user_id, project_id: sorted(
            (
                item
                for item in store.conversations.values()
                if item["user_id"] == user_id
                and item["project_id"] == str(project_id)
            ),
            key=lambda item: item["created_at"],
            reverse=True,
        ),
    )
    monkeypatch.setattr(
        conversations.conversation_service,
        "get_conversation_by_id",
        lambda user_id, conversation_id: (
            item
            if (item := store.conversations.get(str(conversation_id)))
            and item["user_id"] == user_id
            else None
        ),
    )
    monkeypatch.setattr(
        conversations.message_service,
        "list_messages",
        lambda user_id, conversation_id: sorted(
            (
                item
                for item in store.messages.values()
                if item["user_id"] == user_id
                and item["conversation_id"] == str(conversation_id)
            ),
            key=lambda item: item["created_at"],
        ),
    )

    monkeypatch.setattr(chat.project_service, "get_project", projects.project_service.get_project)
    monkeypatch.setattr(chat.conversation_service, "create_conversation", store.create_conversation)
    monkeypatch.setattr(
        chat.conversation_service,
        "get_conversation",
        lambda user_id, project_id, conversation_id: (
            item
            if (item := store.conversations.get(str(conversation_id)))
            and item["user_id"] == user_id
            and item["project_id"] == str(project_id)
            else None
        ),
    )
    monkeypatch.setattr(chat.message_service, "create_message", store.create_message)
    monkeypatch.setattr(chat, "search_project_chunks", lambda **_kwargs: [])
    monkeypatch.setattr(
        chat,
        "generate_grounded_answer",
        lambda question, retrieved_chunks: {
            "answer": "The uploaded story does not provide that detail.",
            "sources": [],
            "status": "no_context",
        },
    )

    def dashboard_overview(user_id: str) -> dict:
        user_projects = [
            item for item in store.projects.values() if item["user_id"] == user_id
        ]
        user_chapters = [
            item for item in store.chapters.values() if item["user_id"] == user_id
        ]
        user_conversations = [
            item
            for item in store.conversations.values()
            if item["user_id"] == user_id
        ]
        return {
            "statistics": {
                "total_projects": len(user_projects),
                "total_chapters": len(user_chapters),
                "total_conversations": len(user_conversations),
                "total_indexed_chunks": 0,
            },
            "recent_projects": sorted(
                user_projects,
                key=lambda item: item["updated_at"],
                reverse=True,
            )[:5],
            "recent_conversations": sorted(
                user_conversations,
                key=lambda item: item["created_at"],
                reverse=True,
            )[:5],
        }

    monkeypatch.setattr(dashboard, "get_dashboard_overview", dashboard_overview)
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-user"}
