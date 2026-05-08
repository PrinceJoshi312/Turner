import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class FinetuneJob(Base):
    __tablename__ = "finetune_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    base_model = Column(String(100), nullable=False)
    hyperparameters = Column(JSONB, nullable=False)
    status = Column(Enum("queued", "running", "completed", "failed", name="job_status_enum"), default="queued")
    vertex_job_id = Column(String(500), nullable=True)
    celery_task_id = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
