from fastapi import APIRouter, HTTPException, Request, status

from app.auth import service as auth_service
from app.auth.schemas import AuthResponse, LoginRequest, RegisterRequest
from app.core.deps import CurrentUser, DbSession
from app.core.request import client_ip
from app.core.security import create_access_token
from app.users.models import User
from app.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["authentication"])


def _build_session(user: User) -> AuthResponse:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return AuthResponse(
        token=create_access_token(subject=str(user.id), role=role),
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, db: DbSession) -> AuthResponse:
    user = await auth_service.authenticate_user(
        db,
        email=payload.email,
        password=payload.password,
        ip=client_ip(request),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _build_session(user)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, request: Request, db: DbSession) -> AuthResponse:
    user = await auth_service.register_user(
        db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        ip=client_ip(request),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    return _build_session(user)


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_current_user: CurrentUser) -> None:
    return None
