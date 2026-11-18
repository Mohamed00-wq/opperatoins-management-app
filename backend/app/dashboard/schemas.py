from app.audit.schemas import AuditLogRead
from app.core.schemas import CamelModel
from app.tasks.schemas import TaskRead


class DashboardStats(CamelModel):
    total_users: int
    active_users: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    failed_operations: int


class TaskActivityPoint(CamelModel):
    label: str
    created: int
    completed: int


class UserActivityPoint(CamelModel):
    label: str
    active: int


class StatusSlice(CamelModel):
    key: str
    label: str
    color: str
    value: int


class SystemStatus(CamelModel):
    api: str
    database: str
    background_jobs: str
    cpu: float
    memory: float
    uptime: str


class DashboardOverview(CamelModel):
    simulated: bool
    stats: DashboardStats
    task_activity: list[TaskActivityPoint]
    user_activity: list[UserActivityPoint]
    status_distribution: list[StatusSlice]
    recent_logs: list[AuditLogRead]
    recent_tasks: list[TaskRead]
    system_status: SystemStatus
