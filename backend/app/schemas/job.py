from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List


class Hyperparameters(BaseModel):
    epochs: int = Field(..., ge=1, le=5)
    learning_rate_multiplier: float = Field(..., ge=0.1, le=10.0)
    adapter_size: int = Field(..., enum=[1, 4, 8, 16])


class JobCreate(BaseModel):
    dataset_id: UUID
    base_model: str = "gemini-1.0-pro-002"
    hyperparameters: Hyperparameters


class JobResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    base_model: str
    hyperparameters: Dict[str, Any]
    status: str
    vertex_job_id: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True
