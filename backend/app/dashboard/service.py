from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_service
from app.audit.models import AuditLog, LogSeverity
from app.tasks.models import Task, TaskStatus
from app.users.models import User, UserStatus

STATUS_LABELS = {
    TaskStatus.PENDING: "Pending",
    TaskStatus.IN_PROGRESS: "In Progress",
    TaskStatus.COMPLETED: "Completed",
    TaskStatus.CANCELLED: "Cancelled",
}

STATUS_COLORS = {
    TaskStatus.PENDING: "#F59E0B",
    TaskStatus.IN_PROGRESS: "#6366F1",
    TaskStatus.COMPLETED: "#10B981",
    TaskStatus.CANCELLED: "#64748B",
}


def _start_of_day(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


async def get_overview(db: AsyncSession) -> dict[str, object]:
    total_users = int(await db.scalar(select(func.count(User.id))) or 0)
    active_users = int(
        await db.scalar(select(func.count(User.id)).where(User.status == UserStatus.ACTIVE)) or 0
    )
    total_tasks = int(await db.scalar(select(func.count(Task.id))) or 0)
    completed_tasks = int(
        await db.scalar(select(func.count(Task.id)).where(Task.status == TaskStatus.COMPLETED)) or 0
    )
    pending_tasks = int(
        await db.scalar(select(func.count(Task.id)).where(Task.status == TaskStatus.PENDING)) or 0
    )
    failed_operations = int(
        await db.scalar(select(func.count(AuditLog.id)).where(AuditLog.severity == LogSeverity.CRITICAL))
        or 0
    )

    task_rows = list((await db.execute(select(Task))).scalars().all())
    log_rows = list(
        (
            await db.execute(
                select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)
            )
        ).scalars().all()
    )

    now = datetime.now(timezone.utc)
    task_activity = []
    for offset in range(13, -1, -1):
        day_start = _start_of_day(now - timedelta(days=offset))
        day_end = day_start + timedelta(days=1)
        task_activity.append(
            {
                "label": day_start.strftime("%b %d"),
                "created": sum(1 for task in task_rows if day_start <= task.created_at < day_end),
                "completed": sum(
                    1
                    for task in task_rows
                    if task.completed_at is not None and day_start <= task.completed_at < day_end
                ),
            }
        )

    user_activity = []
    for offset in range(6, -1, -1):
        day_start = _start_of_day(now - timedelta(days=offset))
        day_end = day_start + timedelta(days=1)
        active_ids = {
            log.user_id
            for log in log_rows
            if log.user_id is not None and day_start <= log.timestamp < day_end
        }
        user_activity.append(
            {
                "label": day_start.strftime("%a"),
                "active": len(active_ids),
            }
        )

    status_distribution = [
        {
            "key": status.value,
            "label": STATUS_LABELS[status],
            "color": STATUS_COLORS[status],
            "value": sum(1 for task in task_rows if task.status is status),
        }
        for status in TaskStatus
    ]

    recent_logs, _ = await audit_service.list_logs(db, page=1, page_size=5)
    recent_tasks = sorted(task_rows, key=lambda task: task.created_at, reverse=True)[:5]

    return {
        "simulated": True,
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "failed_operations": failed_operations,
        },
        "task_activity": task_activity,
        "user_activity": user_activity,
        "status_distribution": status_distribution,
        "recent_logs": recent_logs,
        "recent_tasks": recent_tasks,
        "system_status": {
            "api": "operational",
            "database": "operational",
            "background_jobs": "operational",
            "cpu": 38.5,
            "memory": 61.2,
            "uptime": "99.98%",
        },
    }
