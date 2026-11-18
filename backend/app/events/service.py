from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_service
from app.audit.models import LogSeverity, LogType
from app.core.exceptions import ConflictError, NotFoundError
from app.events.models import Event, EventStatus
from app.users.models import User


async def list_events(
    db: AsyncSession,
    *,
    search: str = "",
    status: EventStatus | None = None,
    page: int = 1,
    page_size: int = 8,
) -> tuple[list[Event], int]:
    query = select(Event)
    conditions = []

    if search:
        pattern = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(Event.title).like(pattern),
                func.lower(Event.description).like(pattern),
                func.lower(Event.location).like(pattern),
            )
        )
    if status is not None:
        conditions.append(Event.status == status)
    if conditions:
        query = query.where(*conditions)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.execute(
        query.order_by(Event.starts_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(rows.scalars().all()), int(total)


async def create_event(
    db: AsyncSession,
    *,
    title: str,
    description: str,
    location: str,
    starts_at: datetime,
    ends_at: datetime,
    status: EventStatus,
    actor: User,
    ip: str | None = None,
) -> Event:
    event = Event(
        title=title.strip(),
        description=description.strip(),
        location=location.strip(),
        starts_at=starts_at,
        ends_at=ends_at,
        status=status,
    )
    db.add(event)
    await audit_service.create_log(
        db,
        user=actor,
        action=f'Created event "{event.title}"',
        type=LogType.SYSTEM,
        severity=LogSeverity.SUCCESS,
        ip=ip,
    )
    await db.commit()
    await db.refresh(event)
    return event


async def update_event(
    db: AsyncSession,
    *,
    event_id: UUID,
    actor: User,
    ip: str | None = None,
    **changes: object,
) -> Event:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundError("Event not found.")

    for field in ("title", "description", "location", "starts_at", "ends_at", "status"):
        value = changes.get(field)
        if value is not None:
            setattr(event, field, value)

    starts_at = changes.get("starts_at", event.starts_at)
    ends_at = changes.get("ends_at", event.ends_at)
    if ends_at <= starts_at:
        raise ConflictError("ends_at must be after starts_at.")

    db.add(event)
    await audit_service.create_log(
        db,
        user=actor,
        action=f'Updated event "{event.title}"',
        type=LogType.SYSTEM,
        severity=LogSeverity.INFO,
        ip=ip,
    )
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(
    db: AsyncSession,
    *,
    event_id: UUID,
    actor: User,
    ip: str | None = None,
) -> None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundError("Event not found.")

    title = event.title
    await audit_service.create_log(
        db,
        user=actor,
        action=f'Deleted event "{title}"',
        type=LogType.SYSTEM,
        severity=LogSeverity.WARNING,
        ip=ip,
    )
    await db.delete(event)
    await db.commit()
