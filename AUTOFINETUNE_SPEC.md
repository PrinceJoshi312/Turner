# AutoFineTune: Project Specification & Implementation Guide

This document defines the complete technical architecture, database schema, API specification, and implementation details for AutoFineTune. Gemini CLI will use this as the single source of truth to generate the codebase file-by-file.

---

## SECTION 1 — SYSTEM ARCHITECTURE

### 1. Architecture Diagram
```text
Browser (React SPA + Tailwind + Recharts)
     ↕ REST (JWT) + WebSocket (Log Streaming)
FastAPI Backend (Cloud Run)
     ↕ Celery (Async Tasks)    ↕ SQLAlchemy (PostgreSQL)  ↕ GCS SDK (Files)    ↕ Vertex AI SDK
   Redis (Broker/PubSub)      PostgreSQL (Cloud SQL)     GCS Bucket          Vertex AI
   (Memorystore)              (Data Persistence)         (Datasets/Models)   (Fine-tuning)
```

### 2. Core Data Flows

**FLOW A: Fine-Tune Job Launch & Monitor**
1. User uploads dataset (CSV/JSONL) → GCS.
2. User submits job config → `POST /api/v1/jobs/`.
3. Backend creates DB record (`queued`) and enqueues `launch_job` Celery task.
4. Celery worker initializes Vertex AI SFT job.
5. Worker polls Vertex AI every 60s and publishes state updates to Redis channel `job_logs:{job_id}`.
6. FastAPI WebSocket subscribes to Redis and streams logs to the frontend.
7. Upon completion, worker saves `model_version` with artifact URI and updates job status to `completed`.

**FLOW B: Evaluation & Benchmarking**
1. User triggers evaluation → `POST /api/v1/evaluations/`.
2. Backend enqueues `run_eval` Celery task.
3. Worker loads the fine-tuned model and the evaluation dataset.
4. Worker runs inference on a 20% split, computes Accuracy, F1, BLEU, and Perplexity.
5. Worker stores metrics in the `evaluations` table.
6. Frontend polls or refreshes to display Recharts dashboards.

### 3. Security Boundary
- **Authentication:** JWT Bearer tokens for all protected routes.
- **Authorization:** Multi-tenancy via `user_id` filtering on all DB queries and GCS paths.
- **GCS Access:** Signed URLs with 1-hour expiry for client-side uploads/downloads.
- **Secrets:** Environment variables for GCP credentials and database URIs.

---

## SECTION 2 — FOLDER STRUCTURE

```text
autofietune/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py      # Router aggregation
│   │   │       ├── auth.py          # /register, /login, /refresh routes
│   │   │       ├── jobs.py          # Job CRUD + WebSocket log endpoint
│   │   │       ├── evaluations.py   # Eval trigger + results endpoints
│   │   │       └── uploads.py       # Dataset file upload + validation status
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings and env vars
│   │   │   ├── security.py          # Password hashing and JWT logic
│   │   │   └── logging.py           # Structured logging configuration
│   │   ├── db/
│   │   │   ├── base.py              # SQLAlchemy DeclarativeBase
│   │   │   ├── session.py           # Async engine and sessionmaker
│   │   │   ├── models/
│   │   │   │   ├── user.py          # User model (auth)
│   │   │   │   ├── dataset.py       # Dataset metadata and GCS links
│   │   │   │   ├── finetune_job.py  # Job config and Vertex job tracking
│   │   │   │   ├── model_version.py # Model artifact references
│   │   │   │   └── evaluation.py    # Eval metrics and status
│   │   │   └── migrations/          # Alembic migrations folder
│   │   ├── schemas/
│   │   │   ├── auth.py              # Auth request/response schemas
│   │   │   ├── job.py               # Job config and status schemas
│   │   │   ├── evaluation.py        # Metrics and comparison schemas
│   │   │   └── upload.py            # Upload metadata schemas
│   │   ├── services/
│   │   │   ├── auth_service.py      # Business logic for user auth
│   │   │   ├── job_service.py       # Job lifecycle management
│   │   │   ├── eval_service.py      # Evaluation tracking logic
│   │   │   └── gcs_service.py       # GCS signed URL and upload helpers
│   │   ├── tasks/
│   │   │   ├── celery_app.py        # Celery instance configuration
│   │   │   ├── finetune_pipeline.py # Training and validation tasks
│   │   │   └── eval_pipeline.py     # Inference and metrics tasks
│   │   ├── workers/
│   │   │   ├── vertex_worker.py     # Vertex AI SDK wrappers
│   │   │   ├── gcs_worker.py        # Worker-specific GCS helpers
│   │   │   └── metrics_worker.py    # Math and NLP metric logic
│   │   └── main.py                  # FastAPI entry point
│   ├── tests/                       # Pytest suite
│   ├── Dockerfile                   # Backend container spec
│   ├── requirements.txt             # Python dependencies
│   ├── alembic.ini                  # Alembic config
│   └── .env.example                 # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Route-level views
│   │   ├── hooks/                   # Custom React hooks (WS, Auth, Polling)
│   │   ├── store/                   # Zustand state management
│   │   ├── api/                     # Axios client and service calls
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx                  # Main router and layout
│   │   └── main.tsx                 # React entry point
│   ├── Dockerfile                   # Frontend container spec
│   └── package.json                 # Node dependencies
└── infra/
    ├── terraform/                   # GCP IaC
    └── docker-compose.yml           # Local dev orchestration
```

---

## SECTION 3 — DATABASE SCHEMA

**Gemini CLI Instruction:** Create all model files in `backend/app/db/models/` using UUID primary keys and `asyncpg` compatibility.

### Models (SQLAlchemy 2.0 Async)

```python
# backend/app/db/models/user.py
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# backend/app/db/models/dataset.py
class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    gcs_uri = Column(String(500), nullable=False)
    file_type = Column(Enum("csv", "jsonl", name="file_type_enum"))
    row_count = Column(Integer, nullable=True)
    status = Column(Enum("uploaded", "validated", "failed", name="dataset_status_enum"), default="uploaded")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# backend/app/db/models/finetune_job.py
class FinetuneJob(Base):
    __tablename__ = "finetune_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"))
    base_model = Column(String(100), nullable=False)
    hyperparameters = Column(JSONB, nullable=False) # {epochs, learning_rate_multiplier, adapter_size}
    status = Column(Enum("queued", "running", "completed", "failed", name="job_status_enum"), default="queued")
    vertex_job_id = Column(String(500), nullable=True)
    celery_task_id = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

# backend/app/db/models/model_version.py
class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("finetune_jobs.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    version_tag = Column(String(100), nullable=False)
    artifact_uri = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# backend/app/db/models/evaluation.py
class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_version_id = Column(UUID(as_uuid=True), ForeignKey("model_versions.id"))
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(Enum("queued", "running", "completed", "failed", name="eval_status_enum"), default="queued")
    metrics = Column(JSONB, nullable=True) # {accuracy, f1, bleu, perplexity}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

---

## SECTION 4 — BACKEND API SPECIFICATION

**Gemini CLI Instruction:** Use FastAPI with `APIRouter`. Implement JWT authentication via `OAuth2PasswordBearer` and Pydantic v2 schemas.

### Endpoints
- **AUTH:**
  - `POST /api/v1/auth/register`: Create user, hash password.
  - `POST /api/v1/auth/login`: Return JWT Access + Refresh.
- **UPLOADS:**
  - `POST /api/v1/uploads/dataset`: Multi-part upload → GCS → Enqueue `validate_dataset`.
  - `GET /api/v1/uploads/dataset/{id}/status`: Poll validation status.
- **JOBS:**
  - `POST /api/v1/jobs/`: Create job → Enqueue `launch_job`.
  - `GET /api/v1/jobs/`: List user's jobs.
  - `GET /api/v1/jobs/{id}`: Detailed job status.
  - `DELETE /api/v1/jobs/{id}`: Cancel job (Vertex + Celery).
  - `WS /api/v1/jobs/{id}/logs`: Stream logs via Redis PubSub.
- **EVALUATIONS:**
  - `POST /api/v1/evaluations/`: Trigger eval.
  - `GET /api/v1/evaluations/`: List evals.
  - `GET /api/v1/evaluations/compare?ids=...`: Fetch multiple for comparison.

---

## SECTION 5 — CORE PIPELINE IMPLEMENTATION

### Pipeline A: Fine-Tune Job (`backend/app/tasks/finetune_pipeline.py`)
```python
import time
import json
from datetime import datetime
import vertexai
from vertexai.preview.tuning import sft
from redis import Redis
from app.core.config import settings
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.finetune_job import FinetuneJob
from app.db.models.dataset import Dataset
from app.db.models.model_version import ModelVersion

@celery_app.task(bind=True)
def launch_job(self, job_id: str):
    db = SessionLocal()
    try:
        job = db.query(FinetuneJob).filter(FinetuneJob.id == job_id).first()
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        dataset = db.query(Dataset).filter(Dataset.id == job.dataset_id).first()
        
        vertexai.init(project=settings.GCP_PROJECT_ID, location=settings.GCP_REGION)
        
        sft_tuning_job = sft.train(
            source_model=job.base_model,
            train_dataset=dataset.gcs_uri,
            epochs=job.hyperparameters["epochs"],
            learning_rate_multiplier=job.hyperparameters["learning_rate_multiplier"],
            adapter_size=job.hyperparameters["adapter_size"],
            tuned_model_display_name=f"autofinetune-{job_id[:8]}",
        )

        job.vertex_job_id = sft_tuning_job.resource_name
        db.commit()

        redis_client = Redis.from_url(settings.REDIS_URL)
        channel = f"job_logs:{job_id}"

        while not sft_tuning_job.has_ended:
            time.sleep(60)
            sft_tuning_job.refresh()
            msg = json.dumps({
                "timestamp": datetime.utcnow().isoformat(),
                "state": sft_tuning_job.state.name,
                "message": f"Vertex Job State: {sft_tuning_job.state.name}"
            })
            redis_client.publish(channel, msg)

        if sft_tuning_job.has_succeeded:
            tuned_model_name = sft_tuning_job.tuned_model_name
            artifact_uri = f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_REGION}/models/{tuned_model_name}"
            
            # Auto-increment version logic here...
            version = ModelVersion(
                job_id=job.id,
                user_id=job.user_id,
                version_tag="v1", # Placeholder for version logic
                artifact_uri=artifact_uri
            )
            db.add(version)
            job.status = "completed"
            redis_client.publish(channel, json.dumps({"type": "done", "status": "completed"}))
        else:
            job.status = "failed"
            job.error_message = "Vertex AI job failed."
            redis_client.publish(channel, json.dumps({"type": "done", "status": "failed", "error": job.error_message}))
        
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()
```

### Pipeline B: Dataset Validation
```python
@celery_app.task
def validate_dataset(dataset_id: str):
    db = SessionLocal()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        # Logic: 
        # 1. Download sample from GCS.
        # 2. Check headers (CSV: input_text, output_text) or JSONL keys.
        # 3. Count rows.
        # 4. If invalid: dataset.status = 'failed', else 'validated'.
        dataset.status = "validated" # Simplified for spec
        dataset.row_count = 1000
        db.commit()
    finally:
        db.close()
```

### Pipeline C: Evaluation (`backend/app/tasks/eval_pipeline.py`)
```python
import pandas as pd
from sacrebleu import corpus_bleu
from sklearn.metrics import f1_score
from vertexai.generative_models import GenerativeModel
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.evaluation import Evaluation
from app.db.models.model_version import ModelVersion
from app.db.models.dataset import Dataset

@celery_app.task
def run_eval(eval_id: str):
    db = SessionLocal()
    try:
        evaluation = db.query(Evaluation).filter(Evaluation.id == eval_id).first()
        evaluation.status = "running"
        db.commit()

        model_version = db.query(ModelVersion).filter(ModelVersion.id == evaluation.model_version_id).first()
        dataset = db.query(Dataset).filter(Dataset.id == evaluation.dataset_id).first()

        # Load data (assuming GCS signed URL or direct access)
        df = pd.read_json(dataset.gcs_uri, lines=True) if dataset.file_type == "jsonl" else pd.read_csv(dataset.gcs_uri)
        eval_set = df.tail(int(len(df) * 0.2)) # Last 20%

        model = GenerativeModel(model_version.artifact_uri)
        
        predictions = []
        references = eval_set["output_text"].tolist()

        for input_text in eval_set["input_text"]:
            response = model.generate_content(input_text)
            predictions.append(response.text.strip())

        # Metrics
        accuracy = sum(1 for p, r in zip(predictions, references) if p == r) / len(references)
        bleu = corpus_bleu(predictions, [references]).score
        # Simplified token-level F1
        f1 = f1_score([1]*len(references), [1]*len(predictions), average='macro') # Placeholder logic

        evaluation.metrics = {
            "accuracy": accuracy,
            "bleu": bleu,
            "f1": f1,
            "perplexity": 0.0 # Placeholder
        }
        evaluation.status = "completed"
        evaluation.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()
```

### WebSocket Log Streamer (`backend/app/api/v1/jobs.py`)
```python
import aioredis
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/{job_id}/logs")
async def stream_logs(websocket: WebSocket, job_id: str, token: str):
    # 1. JWT Verification logic here...
    await websocket.accept()
    
    redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"job_logs:{job_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
                if data.get("type") == "done":
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"job_logs:{job_id}")
        await redis.close()
```

---

## SECTION 7 — ENVIRONMENT VARIABLES

### Backend `.env.example`
```env
# App
SECRET_KEY=yoursecretkey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# DB
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/autofinetune

# GCP
GCP_PROJECT_ID=your-project
GCP_REGION=us-central1
GCS_BUCKET_NAME=autofinetune-data
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Redis
REDIS_URL=redis://localhost:6379/0
```

---

## SECTION 8 — INFRASTRUCTURE & DEPLOYMENT

### Docker Compose
Includes `postgres`, `redis`, `backend`, `celery_worker`, and `frontend`.

### Terraform (GCP)
Defines Cloud Run services, Cloud SQL (PostgreSQL), Memorystore (Redis), and GCS buckets.

---

## SECTION 9 — SECURITY & TESTING

- **Security:** JWT Auth, Row-level DB filtering, GCS Signed URLs, rate limiting.
- **Testing:** Pytest for backend (mocking Vertex/GCS), Vitest for frontend, Playwright for E2E.

---

## SECTION 10 — GEMINI CLI EXECUTION PLAN

PHASE 1: Backend Setup (Steps 1-5)
PHASE 2: DB & Models (Steps 6-10)
PHASE 3: Services & Pipelines (Steps 11-15)
PHASE 4: API & WebSockets (Steps 16-20)
PHASE 5: Frontend Components & Pages (Steps 21-30)

**Final Checkpoint:** Run `docker compose up` and verify the full E2E flow.
