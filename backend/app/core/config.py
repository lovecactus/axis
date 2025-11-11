from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = Field("Axis Backend", description="Service display name.")
    environment: str = Field("development", description="App environment name.")
    debug: bool = Field(True, description="FastAPI debug mode.")

    backend_host: str = Field("0.0.0.0", description="App bind host.")
    backend_port: int = Field(8000, description="App bind port.")

    database_url: str = Field(
        "postgresql+psycopg://axis:axis@localhost:5432/axis",
        description="SQLAlchemy compatible database URL.",
    )
    redis_url: str = Field(
        "redis://localhost:6379/0", description="Redis connection URL."
    )

    jwt_secret_key: str = Field("change-me", description="JWT signing secret.")
    jwt_algorithm: str = Field("HS256", description="JWT signing algorithm.")
    jwt_access_token_expires_minutes: int = Field(
        60 * 24, description="Access token expiry in minutes."
    )

    privy_app_id: Optional[str] = Field(
        default=None, description="Privy application identifier."
    )
    privy_client_secret: Optional[str] = Field(
        default=None, description="Privy client secret."
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

