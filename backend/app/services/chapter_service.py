from uuid import UUID

from app.services.supabase_service import get_supabase_admin_client


def verify_project_ownership(user_id: str, project_id: UUID) -> bool:
    client = get_supabase_admin_client()

    response = (
        client.table("projects")
        .select("id")
        .eq("id", str(project_id))
        .eq("user_id", user_id)
        .execute()
    )

    return bool(response.data)


def create_chapter(
    user_id: str,
    project_id: UUID,
    chapter_data: dict,
) -> dict:
    client = get_supabase_admin_client()

    payload = {
        **chapter_data,
        "project_id": str(project_id),
        "user_id": user_id,
    }

    response = (
        client.table("chapters")
        .insert(payload)
        .execute()
    )

    return response.data[0]


def list_chapters(user_id: str, project_id: UUID) -> list[dict]:
    client = get_supabase_admin_client()

    response = (
        client.table("chapters")
        .select("*")
        .eq("project_id", str(project_id))
        .eq("user_id", user_id)
        .order("chapter_number", desc=False, nullsfirst=False)
        .order("created_at", desc=False)
        .execute()
    )

    return response.data


def get_chapter(user_id: str, chapter_id: UUID) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("chapters")
        .select("*")
        .eq("id", str(chapter_id))
        .eq("user_id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def update_chapter(
    user_id: str,
    chapter_id: UUID,
    chapter_data: dict,
) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("chapters")
        .update(chapter_data)
        .eq("id", str(chapter_id))
        .eq("user_id", user_id)
        .select("*")
        .execute()
    )

    return response.data[0] if response.data else None


def delete_chapter(user_id: str, chapter_id: UUID) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("chapters")
        .delete()
        .eq("id", str(chapter_id))
        .eq("user_id", user_id)
        .select("id, file_path")
        .execute()
    )

    return response.data[0] if response.data else None

def upload_chapter_file(
    user_id: str,
    project_id: UUID,
    chapter_id: UUID,
    file_bytes: bytes,
    extension: str,
) -> str:
    client = get_supabase_admin_client()

    file_path = (
        f"{user_id}/{project_id}/{chapter_id}{extension}"
    )

    content_type = (
        "application/pdf" if extension == ".pdf" else "text/plain"
    )

    client.storage.from_("story-chapters").upload(
        path=file_path,
        file=file_bytes,
        file_options={
            "content-type": content_type,
            "upsert": "false",
        },
    )

    return file_path
def delete_chapter_file(file_path: str) -> None:
    client = get_supabase_admin_client()

    client.storage.from_("story-chapters").remove([file_path])
