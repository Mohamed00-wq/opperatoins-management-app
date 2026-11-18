from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.core.deps import DbSession

router = APIRouter(prefix="/health", tags=["monitoring"])


def _build_series(base: int, spread: int) -> list[dict[str, object]]:
    return [
        {
            "label": f"{(index + 1) * 2}h",
            "value": base + ((index * 37) % spread),
        }
        for index in range(12)
    ]


@router.get("")
async def get_health(db: DbSession) -> dict[str, object]:
    try:
        await db.execute(text("SELECT 1"))
        database_status = "operational"
        database_detail = "Primary database"
        database_latency = 32.4
    except Exception:
        database_status = "degraded"
        database_detail = "Primary database unreachable"
        database_latency = 0

    services = [
        {
            "name": "API Gateway",
            "detail": "FastAPI application",
            "status": "operational",
            "latency": 124.8,
        },
        {
            "name": "PostgreSQL",
            "detail": database_detail,
            "status": database_status,
            "latency": database_latency,
        },
        {
            "name": "Task Queue",
            "detail": "Background workers",
            "status": "operational",
            "latency": 21.6,
        },
    ]

    overall_status = (
        "operational"
        if all(service["status"] == "operational" for service in services)
        else "degraded"
    )

    return {
        "simulated": True,
        "status": overall_status,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "services": services,
        "metrics": {
            "cpu": 41.2,
            "memory": 63.8,
            "requests": 18420,
            "errorRate": 0.32,
            "responseTime": 142,
            "uptime": "99.98%",
        },
        "requestsSeries": _build_series(980, 640),
        "responseSeries": _build_series(112, 84),
        "checks": [
            {"name": "Authentication service", "value": "Healthy", "detail": "Last check 12s ago"},
            {"name": "Database replication", "value": "Healthy", "detail": "Lag 0.4s"},
            {"name": "Object storage", "value": "Healthy", "detail": "Last check 18s ago"},
            {"name": "Email delivery", "value": "Degraded", "detail": "Retry queue elevated"},
            {"name": "Scheduled jobs", "value": "Healthy", "detail": "42 of 42 completed"},
        ],
    }
