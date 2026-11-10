from uuid import UUID

from app.services.supabase_service import get_supabase_admin_client


def create_conversation(user_id: str, project_id: UUID) -> dict:
    client = get_supabase_admin_client()

    response = (
        client.table("conversations")
        .insert({
            "project_id": str(project_id),
            "user_id": user_id,
        })
        .execute()
    )

    return response.data[0]


def get_conversation(
    user_id: str,
    project_id: UUID,
    conversation_id: UUID,
) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("conversations")
        .select("*")
        .eq("id", str(conversation_id))
        .eq("project_id", str(project_id))
        .eq("user_id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def list_conversations(
    user_id: str,
    project_id: UUID,
) -> list[dict]:
    client = get_supabase_admin_client()

    response = (
        client.table("conversations")
        .select("*")
        .eq("project_id", str(project_id))
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data

def get_conversation_by_id(
    user_id: str,
    conversation_id: UUID,
) -> dict | None:
    client = get_supabase_admin_client()

    response = (
        client.table("conversations")
        .select("*")
        .eq("id", str(conversation_id))
        .eq("user_id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None
