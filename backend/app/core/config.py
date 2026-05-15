from typing import List, Optional, Any, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True,
        extra="ignore"
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
    # Use Union to satisfy both the string from Env and the List we want
    ALLOWED_MODELS: Union[List[str], str] = ["gemini-1.0-pro-002"]

    @field_validator("ALLOWED_MODELS", mode="before")
    @classmethod
    def assemble_allowed_models(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [str(item) for item in v]
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["gemini-1.0-pro-002"]
            # Try to parse as JSON if it looks like a list
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
                except Exception:
                    pass
            # Fallback to comma-separated
            return [model.strip() for model in v.split(",") if model.strip()]
        return ["gemini-1.0-pro-002"]


# Create settings instance
try:
    settings = Settings()
except Exception as e:
    # Minimal fallback or let it raise with clear info
    print(f"CRITICAL: Failed to load settings: {e}")
    raise
