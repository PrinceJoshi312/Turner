from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class DatasetUploadResponse(BaseModel):
    dataset_id: UUID
    gcs_uri: str
    status: str


class DatasetStatusResponse(BaseModel):
    dataset_id: UUID
    status: str
    row_count: Optional[int] = None
    error: Optional[str] = None
