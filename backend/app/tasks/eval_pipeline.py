import pandas as pd
import io
import json
from datetime import datetime
from sacrebleu import corpus_bleu
from sklearn.metrics import f1_score
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel
from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.db.models.evaluation import Evaluation
from app.db.models.model_version import ModelVersion
from app.db.models.dataset import Dataset


@celery_app.task(name="app.tasks.eval_pipeline.run_eval")
def run_eval(eval_id: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        evaluation = db.get(Evaluation, eval_id)
        if not evaluation:
            return "Evaluation not found"
        
        evaluation.status = "running"
        db.commit()

        model_version = db.get(ModelVersion, evaluation.model_version_id)
        dataset = db.get(Dataset, evaluation.dataset_id)

        # Download dataset from GCS
        storage_client = storage.Client()
        bucket_name = dataset.gcs_uri.split("/")[2]
        blob_name = "/".join(dataset.gcs_uri.split("/")[3:])
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        content = blob.download_as_bytes()

        if dataset.file_type == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_json(io.BytesIO(content), lines=True)

        # Take last 20% for evaluation
        eval_set = df.tail(max(1, int(len(df) * 0.2)))
        
        vertexai.init(project=settings.GCP_PROJECT_ID, location=settings.GCP_REGION)
        model = GenerativeModel(model_version.artifact_uri)
        
        predictions = []
        references = eval_set["output_text"].tolist()

        for input_text in eval_set["input_text"]:
            try:
                response = model.generate_content(input_text)
                predictions.append(response.text.strip())
            except Exception as e:
                predictions.append("") # Handle generation errors

        # Compute metrics
        accuracy = sum(1 for p, r in zip(predictions, references) if p == r) / len(references)
        bleu = corpus_bleu(predictions, [references]).score
        
        # Simple macro F1 on exact matches for simplicity in this version
        f1 = f1_score(references, predictions, average="macro", zero_division=0)

        evaluation.metrics = {
            "accuracy": round(accuracy, 4),
            "bleu": round(bleu, 4),
            "f1": round(float(f1), 4),
            "perplexity": 0.0 # Placeholder
        }
        evaluation.status = "completed"
        evaluation.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        if evaluation:
            evaluation.status = "failed"
            db.commit()
        return f"Evaluation error: {str(e)}"
    finally:
        db.close()
