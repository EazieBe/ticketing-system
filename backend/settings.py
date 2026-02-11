from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    # Security
    SECRET_KEY: str = (
        "b6d823d579e44d9ba4a0f0ccb1a0c2a2f0f4f5a5d9c0b1a2c3d4e5f6a7b8c9d0"
    )

    # Database
    DATABASE_URL: str = "postgresql://ticketuser:securepassword123@localhost:5432/ticketing"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.43.50:3000",
    ]


settings = Settings()




