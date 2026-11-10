from uuid import UUID

from app.services.supabase_service import get_supabase_admin_client


def create_message(
    user_id: str,
    conversation_id: UUID,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> dict:
    if role not in {"user", "assistant", "system"}:
        raise ValueError("Invalid message role.")

    if not content or not content.strip():
        raise ValueError("Message content cannot be empty.")

    client = get_supabase_admin_client()

    payload = {
        "conversation_id": str(conversation_id),
        "user_id": user_id,
        "role": role,
        "content": content.strip(),
        "sources": sources or [],
    }

    response = (
        client.table("messages")
        .insert(payload)
        .execute()
    )

    return response.data[0]


def list_messages(
    user_id: str,
    conversation_id: UUID,
) -> list[dict]:
    client = get_supabase_admin_client()

    response = (
        client.table("messages")
        .select("*")
        .eq("conversation_id", str(conversation_id))
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )

    return response.data
