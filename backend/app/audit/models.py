from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _enum_values(enum_cls: type[Enum]) -> list[str]:
    return [item.value for item in enum_cls]


class LogType(str, Enum):
    AUTH = "auth"
    TASK = "task"
    USER = "user"
    SYSTEM = "system"


class LogSeverity(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    CRITICAL = "critical"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[LogType] = mapped_column(
        SAEnum(
            LogType,
            name="audit_log_type",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    severity: Mapped[LogSeverity] = mapped_column(
        SAEnum(
            LogSeverity,
            name="audit_log_severity",
            values_callable=_enum_values,
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("ix_audit_logs_created_at_desc", created_at.desc()),)

    @property
    def timestamp(self) -> datetime:
        return self.created_at
