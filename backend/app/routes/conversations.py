from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.services import (
    chapter_service,
    conversation_service,
    message_service,
)


router = APIRouter(tags=["Conversations"])


@router.get("/projects/{project_id}/conversations")
def get_project_conversations(
    project_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    if not chapter_service.verify_project_ownership(user_id, project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return conversation_service.list_conversations(
        user_id=user_id,
        project_id=project_id,
    )


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    conversation = conversation_service.get_conversation_by_id(
        user_id=user_id,
        conversation_id=conversation_id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return message_service.list_messages(
        user_id=user_id,
        conversation_id=conversation_id,
    )
