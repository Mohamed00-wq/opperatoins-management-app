from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request, status as http_status

from app.core.deps import CurrentUser, DbSession
from app.core.request import client_ip
from app.tasks import service as tasks_service
from app.tasks.models import TaskPriority, TaskStatus
from app.tasks.schemas import TaskCreate, TaskList, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])
SortField = Literal["createdDate", "dueDate", "title", "assignee", "id", "priority", "status"]
Direction = Literal["asc", "desc"]


@router.get("", response_model=TaskList)
async def list_tasks(
    db: DbSession,
    _user: CurrentUser,
    search: str = "",
    status: TaskStatus | None = Query(default=None),
    priority: TaskPriority | None = Query(default=None),
    sort: SortField = Query(default="createdDate"),
    direction: Direction = Query(default="desc", alias="dir"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100, alias="pageSize"),
) -> TaskList:
    tasks, total = await tasks_service.list_tasks(
        db,
        search=search,
        status=status,
        priority=priority,
        sort=sort,
        direction=direction,
        page=page,
        page_size=page_size,
    )
    return TaskList(
        items=[TaskRead.model_validate(task) for task in tasks],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=TaskRead, status_code=http_status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> TaskRead:
    task = await tasks_service.create_task(
        db,
        title=payload.title,
        description=payload.description,
        assignee_id=payload.assignee_id,
        priority=payload.priority,
        status=payload.status,
        due_at=payload.due_at,
        actor=user,
        ip=client_ip(request),
    )
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> TaskRead:
    task = await tasks_service.update_task(
        db,
        task_id=task_id,
        actor=user,
        ip=client_ip(request),
        **payload.model_dump(exclude_unset=True, exclude_none=True),
    )
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> None:
    await tasks_service.delete_task(
        db,
        task_id=task_id,
        actor=user,
        ip=client_ip(request),
    )
    return None
