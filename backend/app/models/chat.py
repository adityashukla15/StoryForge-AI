from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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

    @field_validator("question", mode="before")
    @classmethod
    def strip_question(cls, value):
        return value.strip() if isinstance(value, str) else value
