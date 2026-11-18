from datetime import datetime, timezone

from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog, LogSeverity, LogType
from app.users.models import User


async def create_log(
    db: AsyncSession,
    *,
    user: User | None,
    action: str,
    type: LogType,
    severity: LogSeverity,
    ip: str | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user.id if user is not None else None,
        user_name=user.name if user is not None else "System",
        action=action,
        type=type,
        severity=severity,
        ip=ip,
    )
    db.add(log)
    await db.flush()
    return log


async def list_logs(
    db: AsyncSession,
    *,
    search: str = "",
    severity: LogSeverity | None = None,
    type: LogType | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[AuditLog], int]:
    query = select(AuditLog)
    conditions = []

    if search:
        pattern = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(AuditLog.user_name).like(pattern),
                func.lower(AuditLog.action).like(pattern),
                func.lower(func.coalesce(AuditLog.ip, "")).like(pattern),
                func.lower(func.cast(AuditLog.id, String)).like(pattern),
            )
        )
    if severity is not None:
        conditions.append(AuditLog.severity == severity)
    if type is not None:
        conditions.append(AuditLog.type == type)
    if conditions:
        query = query.where(*conditions)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.execute(
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(rows.scalars().all()), int(total)
