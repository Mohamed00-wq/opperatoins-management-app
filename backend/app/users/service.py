from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_service
from app.audit.models import LogSeverity, LogType
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.permissions import Role
from app.core.security import hash_password
from app.users.models import User, UserStatus


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    normalized = email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == normalized))
    return result.scalar_one_or_none()


async def list_users(
    db: AsyncSession,
    *,
    search: str = "",
    role: Role | None = None,
    status: UserStatus | None = None,
    page: int = 1,
    page_size: int = 8,
) -> tuple[list[User], int]:
    query = select(User)
    conditions = []

    if search:
        pattern = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(User.name).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(User.department).like(pattern),
                func.lower(func.cast(User.id, String)).like(pattern),
            )
        )
    if role is not None:
        conditions.append(User.role == role)
    if status is not None:
        conditions.append(User.status == status)
    if conditions:
        query = query.where(*conditions)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.execute(
        query.order_by(User.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(rows.scalars().all()), int(total)


async def create_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    password: str,
    role: Role = Role.EMPLOYEE,
    status: UserStatus = UserStatus.ACTIVE,
    department: str = "Operations",
    phone: str = "",
    actor: User | None = None,
    ip: str | None = None,
    audit_action: str | None = None,
) -> User | None:
    normalized_email = email.strip().lower()
    if await get_user_by_email(db, normalized_email) is not None:
        return None

    user = User(
        name=name.strip(),
        email=normalized_email,
        password_hash=hash_password(password),
        role=role,
        status=status,
        department=department.strip() or "Operations",
        phone=phone.strip(),
    )
    db.add(user)
    action = audit_action or f"Created user account for {user.name}"
    await audit_service.create_log(
        db,
        user=actor,
        action=action,
        type=LogType.USER,
        severity=LogSeverity.SUCCESS,
        ip=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    actor: User,
    ip: str | None = None,
    **changes: object,
) -> User | None:
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None

    previous_status = user.status
    if actor.id == user.id and changes.get("status") is UserStatus.INACTIVE:
        raise ForbiddenError("You cannot deactivate your own account.")

    email = changes.get("email")
    if email is not None:
        normalized_email = str(email).strip().lower()
        existing = await get_user_by_email(db, normalized_email)
        if existing is not None and existing.id != user.id:
            raise ConflictError("A user with this email already exists.")
        user.email = normalized_email

    for field in ("name", "role", "status", "department", "phone"):
        value = changes.get(field)
        if value is not None:
            setattr(user, field, value)

    password = changes.get("password")
    if password is not None:
        user.password_hash = hash_password(str(password))

    db.add(user)
    if previous_status != user.status:
        action = (
            f"{'Activated' if user.status is UserStatus.ACTIVE else 'Deactivated'} "
            f"user account for {user.name}"
        )
        severity = LogSeverity.WARNING
    else:
        action = f"Updated user profile for {user.name}"
        severity = LogSeverity.INFO

    await audit_service.create_log(
        db,
        user=actor,
        action=action,
        type=LogType.USER,
        severity=severity,
        ip=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user
