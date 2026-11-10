from app.services.supabase_service import get_supabase_admin_client


def get_dashboard_overview(user_id: str) -> dict:
    client = get_supabase_admin_client()

    projects_response = (
        client.table("projects")
        .select("id, title, description, genre, created_at, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )

    chapters_response = (
        client.table("chapters")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )

    conversations_response = (
        client.table("conversations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )

    chunks_response = (
        client.table("document_chunks")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )

    recent_conversations_response = (
        client.table("conversations")
        .select("id, project_id, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    return {
        "statistics": {
            "total_projects": len(projects_response.data),
            "total_chapters": chapters_response.count or 0,
            "total_conversations": conversations_response.count or 0,
            "total_indexed_chunks": chunks_response.count or 0,
        },
        "recent_projects": projects_response.data[:5],
        "recent_conversations": recent_conversations_response.data,
    }
