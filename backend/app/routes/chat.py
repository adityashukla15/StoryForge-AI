from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.chat import ChatRequest
from app.services import (
    project_service,
    conversation_service,
    message_service,
)
from app.services.retrieval_service import search_project_chunks
from app.services.chat_service import generate_grounded_answer


router = APIRouter(tags=["Chat"])


@router.post("/projects/{project_id}/chat")
def chat_with_project(
    project_id: UUID,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    # Verify project ownership.
    project = project_service.get_project(user_id, project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    try:
        # Create a new conversation or verify an existing one.
        if request.conversation_id is None:
            conversation = conversation_service.create_conversation(
                user_id=user_id,
                project_id=project_id,
            )
            conversation_id = UUID(conversation["id"])

        else:
            conversation = conversation_service.get_conversation(
                user_id=user_id,
                project_id=project_id,
                conversation_id=request.conversation_id,
            )

            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found.",
                )

            conversation_id = request.conversation_id

        # Persist the user's question.
        message_service.create_message(
            user_id=user_id,
            conversation_id=conversation_id,
            role="user",
            content=request.question,
        )

        # Retrieve relevant chapter chunks.
        retrieved_chunks = search_project_chunks(
            user_id=user_id,
            project_id=project_id,
            query=request.question,
            match_count=5,
        )

        # Generate a grounded answer.
        result = generate_grounded_answer(
            question=request.question,
            retrieved_chunks=retrieved_chunks,
        )

        # Persist the assistant response and its source references.
        assistant_message = message_service.create_message(
            user_id=user_id,
            conversation_id=conversation_id,
            role="assistant",
            content=result["answer"],
            sources=result["sources"],
        )

        return {
            "project_id": str(project_id),
            "conversation_id": str(conversation_id),
            "question": request.question,
            "answer": result["answer"],
            "sources": result["sources"],
            "status": result["status"],
            "message_id": assistant_message["id"],
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="StoryForge AI is temporarily unavailable. Please try again.",
        )
