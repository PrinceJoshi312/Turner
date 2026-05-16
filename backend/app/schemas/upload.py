from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List, Dict, Any


class DatasetUploadResponse(BaseModel):
    dataset_id: UUID
    gcs_uri: str
    status: str


class DatasetStatusResponse(BaseModel):
    dataset_id: UUID
    status: str
    row_count: Optional[int] = None
    error_message: Optional[str] = None


class DatasetPreviewResponse(BaseModel):
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    filename: str


class ColumnMappingRequest(BaseModel):
    dataset_id: UUID
    mapping: Dict[str, str] # e.g. {"input_text": "my_input", "output_text": "my_output"}
