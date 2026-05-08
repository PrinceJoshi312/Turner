from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.evaluation import Evaluation
from app.db.models.model_version import ModelVersion
from app.db.models.dataset import Dataset
from app.api.deps import get_current_user
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse
from app.tasks.eval_pipeline import run_eval

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


@router.post("/", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    eval_in: EvaluationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify model version and dataset belong to user
    result_mv = await db.execute(
        select(ModelVersion).where(
            ModelVersion.id == eval_in.model_version_id, ModelVersion.user_id == current_user.id
        )
    )
    if not result_mv.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Model version not found")

    result_ds = await db.execute(
        select(Dataset).where(
            Dataset.id == eval_in.dataset_id, Dataset.user_id == current_user.id
        )
    )
    if not result_ds.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dataset not found")

    db_eval = Evaluation(
        model_version_id=eval_in.model_version_id,
        dataset_id=eval_in.dataset_id,
        user_id=current_user.id,
        status="queued",
    )
    db.add(db_eval)
    await db.commit()
    await db.refresh(db_eval)

    # Enqueue eval task
    run_eval.delay(str(db_eval.id))

    return db_eval


@router.get("/", response_model=List[EvaluationResponse])
async def list_evaluations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.user_id == current_user.id)
        .order_by(desc(Evaluation.created_at))
    )
    return result.scalars().all()


@router.get("/compare", response_model=List[EvaluationResponse])
async def compare_evaluations(
    ids: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    eval_ids = ids.split(",")
    result = await db.execute(
        select(Evaluation).where(
            Evaluation.id.in_(eval_ids), Evaluation.user_id == current_user.id
        )
    )
    return result.scalars().all()


@router.get("/{eval_id}", response_model=EvaluationResponse)
async def get_evaluation(
    eval_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evaluation).where(
            Evaluation.id == eval_id, Evaluation.user_id == current_user.id
        )
    )
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation
