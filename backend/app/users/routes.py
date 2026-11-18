from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.deps import DbSession, require_permission
from app.core.permissions import Permission, Role
from app.core.request import client_ip
from app.users import service as users_service
from app.users.models import User, UserStatus
from app.users.schemas import UserCreate, UserList, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
AdminUser = Annotated[User, Depends(require_permission(Permission.MANAGE_USERS))]


@router.get("", response_model=UserList)
async def list_users(
    db: DbSession,
    _admin: AdminUser,
    search: str = "",
    role: Role | None = Query(default=None),
    status: UserStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100, alias="pageSize"),
) -> UserList:
    users, total = await users_service.list_users(
        db,
        search=search,
        role=role,
        status=status,
        page=page,
        page_size=page_size,
    )
    return UserList(
        items=[UserRead.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    request: Request,
    db: DbSession,
    admin: AdminUser,
) -> UserRead:
    user = await users_service.create_user(
        db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        status=payload.status,
        department=payload.department,
        phone=payload.phone,
        actor=admin,
        ip=client_ip(request),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    request: Request,
    db: DbSession,
    admin: AdminUser,
) -> UserRead:
    user = await users_service.update_user(
        db,
        user_id=user_id,
        actor=admin,
        ip=client_ip(request),
        **payload.model_dump(exclude_unset=True, exclude_none=True),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserRead.model_validate(user)
