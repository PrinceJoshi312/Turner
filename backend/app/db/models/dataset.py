import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    gcs_uri = Column(String(500), nullable=False)
    file_type = Column(Enum("csv", "jsonl", name="file_type_enum"), nullable=False)
    row_count = Column(Integer, nullable=True)
    status = Column(Enum("uploaded", "validated", "failed", name="dataset_status_enum"), default="uploaded")
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
