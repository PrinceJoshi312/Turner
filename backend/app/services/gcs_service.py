import datetime
from google.cloud import storage
from app.core.config import settings


class GCSService:
    def __init__(self):
        self.client = storage.Client()
        self.bucket = self.client.bucket(settings.GCS_BUCKET_NAME)

    def upload_file(self, file_content: bytes, destination_blob_name: str) -> str:
        blob = self.bucket.blob(destination_blob_name)
        blob.upload_from_string(file_content)
        return f"gs://{settings.GCS_BUCKET_NAME}/{destination_blob_name}"

    def generate_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> str:
        blob = self.bucket.blob(blob_name)
        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiration_minutes),
            method="GET",
        )
        return url
