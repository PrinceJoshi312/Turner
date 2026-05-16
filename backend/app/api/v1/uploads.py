from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.dataset import Dataset
from app.api.deps import get_current_user
from app.services.gcs_service import GCSService
from app.schemas.upload import DatasetUploadResponse, DatasetStatusResponse
from app.schemas.upload import DatasetUploadResponse, DatasetStatusResponse, DatasetPreviewResponse, ColumnMappingRequest
import io
import pandas as pd

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/dataset", response_model=DatasetUploadResponse)
async def upload_dataset(
    name: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    if not file.filename.endswith((".csv", ".jsonl")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and JSONL files are allowed",
        )

    file_type = "csv" if file.filename.endswith(".csv") else "jsonl"
    dataset_id = uuid4()
    file_content = await file.read()

    # Check size
    if len(file_content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    gcs_path = f"datasets/{current_user.id}/{dataset_id}/{file.filename}"
    gcs_service = GCSService()
    gcs_uri = gcs_service.upload_file(file_content, gcs_path)

    db_dataset = Dataset(
        id=dataset_id,
        user_id=current_user.id,
        name=name,
        gcs_uri=gcs_uri,
        file_type=file_type,
        status="uploaded",
    )
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)

    # Note: We NO LONGER enqueue validation here automatically. 
    # The frontend will call /preview, then /mapping, and /mapping will trigger validation.

    return DatasetUploadResponse(
        dataset_id=db_dataset.id,
        gcs_uri=db_dataset.gcs_uri,
        status=db_dataset.status,
    )


@router.get("/dataset/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def get_dataset_preview(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Read from local storage (or GCS)
    if dataset.gcs_uri.startswith("local://"):
        local_path = f"/app/data/local_storage/{dataset.gcs_uri.replace('local://', '')}"
        try:
            if dataset.file_type == "csv":
                df = pd.read_csv(local_path, nrows=5)
            else:
                df = pd.read_json(local_path, lines=True, nrows=5)

            return DatasetPreviewResponse(
                columns=list(df.columns),
                sample_rows=df.to_dict(orient="records"),
                filename=dataset.gcs_uri.split("/")[-1]
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")
    else:
        # GCP logic omitted for brevity in this stabilization turn
        raise HTTPException(status_code=501, detail="GCP preview not implemented yet")


@router.post("/dataset/mapping")
async def apply_column_mapping(
    req: ColumnMappingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset.column_mapping = req.mapping
    dataset.status = "uploaded" # Reset status to trigger re-validation
    await db.commit()

    # Trigger validation
    from app.tasks.finetune_pipeline import validate_dataset
    validate_dataset.delay(str(dataset.id))

    return {"message": "Mapping applied, validation started"}

    )


@router.get("/dataset/{dataset_id}/status", response_model=DatasetStatusResponse)
async def get_dataset_status(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(
            Dataset.id == dataset_id, Dataset.user_id == current_user.id
        )
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return DatasetStatusResponse(
        dataset_id=dataset.id,
        status=dataset.status,
        row_count=dataset.row_count,
        error_message=dataset.error_message,
    )
