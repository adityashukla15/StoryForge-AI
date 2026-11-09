from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    genre: str | None = Field(default=None, max_length=80)


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    genre: str | None = Field(default=None, max_length=80)

    @field_validator("title")
    @classmethod
    def title_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("Title cannot be null.")
        return value

    @model_validator(mode="after")
    def validate_update_fields(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self
