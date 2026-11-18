from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import DbSession, require_permission
from app.core.permissions import Permission
from app.dashboard import service as dashboard_service
from app.dashboard.schemas import DashboardOverview
from app.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
DashboardReader = Annotated[User, Depends(require_permission(Permission.VIEW_DASHBOARD))]


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    db: DbSession,
    _reader: DashboardReader,
) -> DashboardOverview:
    data = await dashboard_service.get_overview(db)
    return DashboardOverview.model_validate(data)
