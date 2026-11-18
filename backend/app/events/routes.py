from uuid import UUID

from fastapi import APIRouter, Query, Request, status as http_status

from app.core.deps import CurrentUser, DbSession
from app.core.request import client_ip
from app.events import service as events_service
from app.events.models import EventStatus
from app.events.schemas import EventCreate, EventList, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventList)
async def list_events(
    db: DbSession,
    _user: CurrentUser,
    search: str = "",
    status: EventStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100, alias="pageSize"),
) -> EventList:
    events, total = await events_service.list_events(
        db,
        search=search,
        status=status,
        page=page,
        page_size=page_size,
    )
    return EventList(
        items=[EventRead.model_validate(event) for event in events],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=EventRead, status_code=http_status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> EventRead:
    event = await events_service.create_event(
        db,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=payload.status,
        actor=user,
        ip=client_ip(request),
    )
    return EventRead.model_validate(event)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> EventRead:
    event = await events_service.update_event(
        db,
        event_id=event_id,
        actor=user,
        ip=client_ip(request),
        **payload.model_dump(exclude_unset=True, exclude_none=True),
    )
    return EventRead.model_validate(event)


@router.delete("/{event_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> None:
    await events_service.delete_event(
        db,
        event_id=event_id,
        actor=user,
        ip=client_ip(request),
    )
    return None
