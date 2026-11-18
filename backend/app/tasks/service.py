from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import String, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_service
from app.audit.models import LogSeverity, LogType
from app.core.exceptions import NotFoundError
from app.tasks.models import Task, TaskPriority, TaskStatus
from app.users import service as users_service
from app.users.models import User


def _priority_order():
    return case(
        (Task.priority == TaskPriority.CRITICAL, 0),
        (Task.priority == TaskPriority.HIGH, 1),
        (Task.priority == TaskPriority.MEDIUM, 2),
        (Task.priority == TaskPriority.LOW, 3),
        else_=4,
    )


def _status_order():
    return case(
        (Task.status == TaskStatus.PENDING, 0),
        (Task.status == TaskStatus.IN_PROGRESS, 1),
        (Task.status == TaskStatus.COMPLETED, 2),
        (Task.status == TaskStatus.CANCELLED, 3),
        else_=4,
    )


async def list_tasks(
    db: AsyncSession,
    *,
    search: str = "",
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    sort: str = "createdDate",
    direction: str = "desc",
    page: int = 1,
    page_size: int = 8,
) -> tuple[list[Task], int]:
    query = select(Task).join(User, Task.assignee_id == User.id)
    conditions = []

    if search:
        pattern = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(Task.title).like(pattern),
                func.lower(Task.description).like(pattern),
                func.lower(User.name).like(pattern),
                func.lower(func.cast(Task.id, String)).like(pattern),
            )
        )
    if status is not None:
        conditions.append(Task.status == status)
    if priority is not None:
        conditions.append(Task.priority == priority)
    if conditions:
        query = query.where(*conditions)

    order_columns = {
        "createdDate": Task.created_at,
        "dueDate": Task.due_at,
        "title": Task.title,
        "assignee": User.name,
        "id": Task.id,
        "priority": _priority_order(),
        "status": _status_order(),
    }
    order_column = order_columns.get(sort, Task.created_at)
    ordering = order_column.asc() if direction == "asc" else order_column.desc()

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.execute(
        query.order_by(ordering).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars().all()), int(total)


async def create_task(
    db: AsyncSession,
    *,
    title: str,
    description: str,
    assignee_id: UUID,
    priority: TaskPriority,
    status: TaskStatus,
    due_at: datetime,
    actor: User,
    ip: str | None = None,
) -> Task:
    assignee = await users_service.get_user_by_id(db, assignee_id)
    if assignee is None:
        raise NotFoundError("Assignee not found.")

    task = Task(
        title=title.strip(),
        description=description.strip(),
        assignee_id=assignee.id,
        priority=priority,
        status=status,
        due_at=due_at,
        completed_at=datetime.now(timezone.utc) if status is TaskStatus.COMPLETED else None,
    )
    db.add(task)
    await audit_service.create_log(
        db,
        user=actor,
        action=f'Created task "{task.title}"',
        type=LogType.TASK,
        severity=LogSeverity.SUCCESS,
        ip=ip,
    )
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(
    db: AsyncSession,
    *,
    task_id: UUID,
    actor: User,
    ip: str | None = None,
    title: str | None = None,
    description: str | None = None,
    assignee_id: UUID | None = None,
    priority: TaskPriority | None = None,
    status: TaskStatus | None = None,
    due_at: datetime | None = None,
) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise NotFoundError("Task not found.")

    previous_status = task.status

    if assignee_id is not None:
        assignee = await users_service.get_user_by_id(db, assignee_id)
        if assignee is None:
            raise NotFoundError("Assignee not found.")
        task.assignee_id = assignee.id

    changes = {
        "title": title,
        "description": description,
        "priority": priority,
        "status": status,
        "due_at": due_at,
    }
    for field, value in changes.items():
        if value is not None:
            setattr(task, field, value)

    if status is not None and status is not previous_status:
        if status is TaskStatus.COMPLETED and task.completed_at is None:
            task.completed_at = datetime.now(timezone.utc)
        elif status is not TaskStatus.COMPLETED:
            task.completed_at = None

    db.add(task)
    if status is TaskStatus.COMPLETED and previous_status is not TaskStatus.COMPLETED:
        action = f'Completed task "{task.title}"'
        severity = LogSeverity.SUCCESS
    else:
        action = f'Updated task "{task.title}"'
        severity = LogSeverity.INFO

    await audit_service.create_log(
        db,
        user=actor,
        action=action,
        type=LogType.TASK,
        severity=severity,
        ip=ip,
    )
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(
    db: AsyncSession,
    *,
    task_id: UUID,
    actor: User,
    ip: str | None = None,
) -> None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise NotFoundError("Task not found.")

    title = task.title
    await audit_service.create_log(
        db,
        user=actor,
        action=f'Deleted task "{title}"',
        type=LogType.TASK,
        severity=LogSeverity.WARNING,
        ip=ip,
    )
    await db.delete(task)
    await db.commit()
