from datetime import datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.core.schemas import CamelModel
from app.tasks.models import TaskPriority, TaskStatus


class TaskCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    assignee_id: UUID
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    due_at: datetime


class TaskUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    assignee_id: UUID | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_at: datetime | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "TaskUpdate":
        if not any(value is not None for value in self.model_dump().values()):
            raise ValueError("At least one field must be provided.")
        return self


class TaskRead(CamelModel):
    id: UUID
    title: str
    description: str
    assignee_id: UUID
    assignee: str
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    due_at: datetime
    completed_at: datetime | None


class TaskList(CamelModel):
    items: list[TaskRead]
    total: int
    page: int
    page_size: int
    total_pages: int
