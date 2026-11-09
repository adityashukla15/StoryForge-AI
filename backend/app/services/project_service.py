from uuid import UUID

from app.services.supabase_service import get_supabase_admin_client


def create_project(user_id: str, project_data: dict) -> dict:
    client = get_supabase_admin_client()

    payload = {
        **project_data,
        "user_id": user_id,
    }

    response = (
        client.table("projects")
        .insert(payload)
        .execute()
    )

    return response.data[0]


def list_projects(user_id: str) -> list[dict]:
    client = get_supabase_admin_client()

    response = (
        client.table("projects")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


def get_project(user_id: str, project_id: UUID) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("projects")
        .select("*")
        .eq("id", str(project_id))
        .eq("user_id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def update_project(
    user_id: str,
    project_id: UUID,
    project_data: dict,
) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("projects")
        .update(project_data)
        .eq("id", str(project_id))
        .eq("user_id", user_id)
        .select("*")
        .execute()
    )

    return response.data[0] if response.data else None


def delete_project(user_id: str, project_id: UUID) -> bool:
    client = get_supabase_admin_client()

    response = (
        client.table("projects")
        .delete()
        .eq("id", str(project_id))
        .eq("user_id", user_id)
        .select("id")
        .execute()
    )

    return bool(response.data)
