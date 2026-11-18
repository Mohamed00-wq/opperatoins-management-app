from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.permissions import Role as UserRole
from app.database.base import Base


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


def _enum_values(enum_cls: type[Enum]) -> list[str]:
    return [item.value for item in enum_cls]


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, repr=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="user_role",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=False,
        default=UserRole.EMPLOYEE,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(
            UserStatus,
            name="user_status",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=False,
        default=UserStatus.ACTIVE,
    )
    department: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        default="Operations",
        server_default="Operations",
    )
    phone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="",
        server_default="",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    tasks: Mapped[list["Task"]] = relationship(back_populates="assignee_user")

    __table_args__ = (Index("ix_users_email_lower", func.lower(email), unique=True),)

    @property
    def is_active(self) -> bool:
        return self.status is UserStatus.ACTIVE
