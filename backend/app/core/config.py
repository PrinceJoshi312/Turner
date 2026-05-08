from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )

    # App
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str

    # Redis / Celery
    REDIS_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # GCP
    GCP_PROJECT_ID: str
    GCP_REGION: str = "us-central1"
    GCS_BUCKET_NAME: str
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    VERTEX_STAGING_BUCKET: str

    # Limits
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_MODELS: List[str] = ["gemini-1.0-pro-002"]


settings = Settings()
