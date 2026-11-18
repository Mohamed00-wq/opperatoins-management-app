from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from app.core.permissions import Role
from app.core.schemas import CamelModel
from app.users.models import UserStatus


class UserBase(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    department: str = Field(default="Operations", max_length=120)
    phone: str = Field(default="", max_length=64)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.EMPLOYEE
    status: UserStatus = UserStatus.ACTIVE


class UserUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: Role | None = None
    status: UserStatus | None = None
    department: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "UserUpdate":
        if not any(value is not None for value in self.model_dump().values()):
            raise ValueError("At least one field must be provided.")
        return self


class UserRead(CamelModel):
    id: UUID
    name: str
    email: EmailStr
    role: Role
    status: UserStatus
    department: str
    phone: str
    created_at: datetime
    last_login: datetime | None


class UserList(CamelModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int
    total_pages: int
