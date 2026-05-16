import time
import json
import pandas as pd
import io
from datetime import datetime
from redis import Redis
import vertexai
from vertexai.preview.tuning import sft
from google.cloud import storage
from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models.finetune_job import FinetuneJob
from app.db.models.dataset import Dataset
from app.db.models.model_version import ModelVersion
from sqlalchemy import select, func


@celery_app.task(name="app.tasks.finetune_pipeline.validate_dataset")
def validate_dataset(dataset_id: str):
    # Use sync SQLAlchemy session for Celery
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Need sync engine for sync session
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            return "Dataset not found"

        if dataset.gcs_uri.startswith("local://"):
            local_path = f"/app/data/local_storage/{dataset.gcs_uri.replace('local://', '')}"
            with open(local_path, "rb") as f:
                content = f.read()
        else:
            storage_client = storage.Client()
            bucket_name = dataset.gcs_uri.split("/")[2]
            blob_name = "/".join(dataset.gcs_uri.split("/")[3:])
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            content = blob.download_as_bytes()
        
        try:
            if dataset.file_type == "csv":
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_json(io.BytesIO(content), lines=True)
            
            # Check for required columns
            if "input_text" not in df.columns or "output_text" not in df.columns:
                dataset.status = "failed"
                print(f"VALIDATION FAILED: Required columns missing. Found columns: {list(df.columns)}")
            else:
                dataset.status = "validated"
                dataset.row_count = len(df)
                print(f"VALIDATION SUCCESS: {len(df)} rows validated.")
            
            db.commit()
        except Exception as e:
            dataset.status = "failed"
            db.commit()
            return f"Validation error: {str(e)}"

    finally:
        db.close()


@celery_app.task(name="app.tasks.finetune_pipeline.launch_job", bind=True)
def launch_job(self, job_id: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        job = db.get(FinetuneJob, job_id)
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        dataset = db.get(Dataset, job.dataset_id)
        
        # Check for GCP credentials
        import os
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not creds_path or not os.path.exists(creds_path) or dataset.gcs_uri.startswith("local://"):
            # Simulation Mode
            redis_client = Redis.from_url(settings.REDIS_URL)
            channel = f"job_logs:{job_id}"
            
            states = ["PENDING", "RUNNING", "RUNNING", "SUCCEEDED"]
            for state in states:
                msg = json.dumps({
                    "timestamp": datetime.utcnow().isoformat(),
                    "state": state,
                    "message": f"SIMULATION: Job state is {state}"
                })
                redis_client.publish(channel, msg)
                time.sleep(5)
            
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            db.commit()
            redis_client.publish(channel, json.dumps({"type": "done", "status": "completed"}))
            return

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
            
            # Get next version tag
            version_count = db.query(func.count(ModelVersion.id)).filter(ModelVersion.user_id == job.user_id).scalar()
            version_tag = f"v{version_count + 1}"
            
            version = ModelVersion(
                job_id=job.id,
                user_id=job.user_id,
                version_tag=version_tag,
                artifact_uri=artifact_uri
            )
            db.add(version)
            job.status = "completed"
            redis_client.publish(channel, json.dumps({"type": "done", "status": "completed"}))
        else:
            job.status = "failed"
            job.error_message = f"Vertex AI job failed with state: {sft_tuning_job.state.name}"
            redis_client.publish(channel, json.dumps({"type": "done", "status": "failed", "error": job.error_message}))
        
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()
