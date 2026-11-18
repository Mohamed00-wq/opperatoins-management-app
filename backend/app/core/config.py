from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Operations Management API"
    app_version: str = "1.0.0"
    environment: Literal["development", "testing", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: SecretStr
    secret_key: SecretStr

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=30, gt=0, le=10080)

    db_pool_size: int = Field(default=5, gt=0, le=100)
    db_max_overflow: int = Field(default=10, ge=0, le=100)
    db_echo: bool = False

    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("secret_key")
    @classmethod
    def validate_secret_strength(cls, value: SecretStr, info: ValidationInfo) -> SecretStr:
        if info.data.get("environment") == "production" and len(value.get_secret_value()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production.")
        return value

    @property
    def sqlalchemy_database_url(self) -> str:
        return self.database_url.get_secret_value()

    @property
    def jwt_secret(self) -> str:
        return self.secret_key.get_secret_value()

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
