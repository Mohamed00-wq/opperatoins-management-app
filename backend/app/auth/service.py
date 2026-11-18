from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import service as audit_service
from app.audit.models import LogSeverity, LogType
from app.core.permissions import Role
from app.core.security import hash_password, verify_password
from app.users import service as users_service
from app.users.models import User, UserStatus

DUMMY_PASSWORD_HASH = hash_password("not-a-real-password-used-for-timing")


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    ip: str | None = None,
) -> User | None:
    user = await users_service.get_user_by_email(db, email)

    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        await audit_service.create_log(
            db,
            user=None,
            action="Failed sign-in attempt",
            type=LogType.AUTH,
            severity=LogSeverity.WARNING,
            ip=ip,
        )
        await db.commit()
        return None

    if user.status is not UserStatus.ACTIVE or not verify_password(password, user.password_hash):
        await audit_service.create_log(
            db,
            user=user,
            action="Failed sign-in attempt",
            type=LogType.AUTH,
            severity=LogSeverity.WARNING,
            ip=ip,
        )
        await db.commit()
        return None

    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    await audit_service.create_log(
        db,
        user=user,
        action="Signed in to the workspace",
        type=LogType.AUTH,
        severity=LogSeverity.SUCCESS,
        ip=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user


async def register_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    password: str,
    ip: str | None = None,
) -> User | None:
    return await users_service.create_user(
        db,
        name=name,
        email=email,
        password=password,
        role=Role.EMPLOYEE,
        status=UserStatus.ACTIVE,
        department="Operations",
        phone="",
        actor=None,
        ip=ip,
        audit_action="Created a new account through self-service registration for",
    )
