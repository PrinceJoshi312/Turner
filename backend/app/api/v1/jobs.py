import json
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.finetune_job import FinetuneJob
from app.db.models.dataset import Dataset
from app.api.deps import get_current_user
from app.schemas.job import JobCreate, JobResponse
from app.tasks.finetune_pipeline import launch_job
from app.core.config import settings
from jose import jwt, JWTError

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify dataset exists and belongs to user
    result = await db.execute(
        select(Dataset).where(
            Dataset.id == job_in.dataset_id, Dataset.user_id == current_user.id
        )
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.status != "validated":
        raise HTTPException(
            status_code=400, detail="Dataset must be validated before launching a job"
        )

    db_job = FinetuneJob(
        user_id=current_user.id,
        dataset_id=job_in.dataset_id,
        base_model=job_in.base_model,
        hyperparameters=job_in.hyperparameters.dict(),
        status="queued",
    )
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)

    # Enqueue launch task
    launch_job.delay(str(db_job.id))

    return db_job


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinetuneJob)
        .where(FinetuneJob.user_id == current_user.id)
        .order_by(desc(FinetuneJob.created_at))
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinetuneJob).where(
            FinetuneJob.id == job_id, FinetuneJob.user_id == current_user.id
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def cancel_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinetuneJob).where(
            FinetuneJob.id == job_id, FinetuneJob.user_id == current_user.id
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Job already finished")

    # Vertex cancellation logic would go here
    # For now, just mark as failed/cancelled
    job.status = "failed"
    job.error_message = "Cancelled by user"
    await db.commit()
    
    return {"message": "Job cancelled"}


@router.websocket("/{job_id}/logs")
async def stream_logs(websocket: WebSocket, job_id: str, token: str):
    # Verify JWT from token query param
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    
    redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel = f"job_logs:{job_id}"
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
                if data.get("type") == "done":
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await pubsub.unsubscribe(channel)
        await redis_client.close()
