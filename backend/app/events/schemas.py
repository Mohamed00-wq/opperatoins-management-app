from datetime import datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.core.schemas import CamelModel
from app.events.models import EventStatus


class EventCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    location: str = Field(default="", max_length=160)
    starts_at: datetime
    ends_at: datetime
    status: EventStatus = EventStatus.SCHEDULED

    @model_validator(mode="after")
    def validate_window(self) -> "EventCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at.")
        return self


class EventUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=160)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: EventStatus | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "EventUpdate":
        if not any(value is not None for value in self.model_dump().values()):
            raise ValueError("At least one field must be provided.")
        return self

    @model_validator(mode="after")
    def validate_window(self) -> "EventUpdate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at.")
        return self


class EventRead(CamelModel):
    id: UUID
    title: str
    description: str
    location: str
    starts_at: datetime
    ends_at: datetime
    status: EventStatus
    created_at: datetime


class EventList(CamelModel):
    items: list[EventRead]
    total: int
    page: int
    page_size: int
    total_pages: int
