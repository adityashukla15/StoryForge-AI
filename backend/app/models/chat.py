from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Question about the project's fictional universe.",
    )

    conversation_id: UUID | None = Field(
        default=None,
        description="Existing conversation ID. Leave empty to start a new conversation.",
    )
