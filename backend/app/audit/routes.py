from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.audit import service as audit_service
from app.audit.models import LogSeverity, LogType
from app.audit.schemas import AuditLogList, AuditLogRead
from app.core.deps import DbSession, require_permission
from app.core.permissions import Permission
from app.users.models import User

router = APIRouter(prefix="/logs", tags=["audit"])
AuditReader = Annotated[User, Depends(require_permission(Permission.VIEW_LOGS))]


@router.get("", response_model=AuditLogList)
async def list_logs(
    db: DbSession,
    _reader: AuditReader,
    search: str = "",
    severity: LogSeverity | None = Query(default=None),
    log_type: LogType | None = Query(default=None, alias="type"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100, alias="pageSize"),
) -> AuditLogList:
    logs, total = await audit_service.list_logs(
        db,
        search=search,
        severity=severity,
        type=log_type,
        page=page,
        page_size=page_size,
    )
    return AuditLogList(
        items=[AuditLogRead.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )
