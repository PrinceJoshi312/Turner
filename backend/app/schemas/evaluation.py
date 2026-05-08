from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List


class EvaluationCreate(BaseModel):
    model_version_id: UUID
    dataset_id: UUID


class EvaluationResponse(BaseModel):
    id: UUID
    model_version_id: UUID
    dataset_id: UUID
    user_id: UUID
    status: str
    metrics: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
