from datetime import datetime
from uuid import UUID

from app.audit.models import LogSeverity, LogType
from app.core.schemas import CamelModel


class AuditLogRead(CamelModel):
    id: UUID
    user_id: UUID | None
    user_name: str
    action: str
    type: LogType
    severity: LogSeverity
    ip: str | None
    timestamp: datetime


class AuditLogList(CamelModel):
    items: list[AuditLogRead]
    total: int
    page: int
    page_size: int
    total_pages: int
