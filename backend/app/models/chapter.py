from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChapterCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    chapter_number: int | None = Field(default=None, ge=1)


class ChapterUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    chapter_number: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")

        for field_name in ("title", "content"):
            if field_name in self.model_fields_set:
                if getattr(self, field_name) is None:
                    raise ValueError(f"{field_name} cannot be null.")

        return self
