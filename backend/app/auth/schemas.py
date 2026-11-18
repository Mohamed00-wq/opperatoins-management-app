from pydantic import EmailStr, Field

from app.core.schemas import CamelModel
from app.users.schemas import UserRead


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(CamelModel):
    token: str
    user: UserRead
