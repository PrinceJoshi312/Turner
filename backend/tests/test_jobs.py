import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from app.db.models.dataset import Dataset
from app.db.models.user import User

@pytest.mark.asyncio
async def test_create_job_success(client, mock_db_session, mock_user):
    # Setup mocks
    mock_dataset = Dataset(id=uuid4(), user_id=mock_user.id, status="validated", gcs_uri="gs://bucket/data.jsonl")

    # First execute for dataset check
    mock_db_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_dataset)

    job_data = {
        "dataset_id": str(mock_dataset.id),
        "base_model": "gemini-1.0-pro-002",
        "hyperparameters": {
            "epochs": 3,
            "learning_rate_multiplier": 1.0,
            "adapter_size": 4
        }
    }

    with patch("app.api.v1.jobs.launch_job.delay") as mock_launch:
        response = await client.post("/api/v1/jobs/", json=job_data)

        assert response.status_code == 201
        assert response.json()["status"] == "queued"
        assert mock_launch.called
        # Check that it was called with a string UUID
        args, _ = mock_launch.call_args
        assert len(args[0]) == 36 # UUID length
        assert mock_db_session.commit.called
@pytest.mark.asyncio
async def test_create_job_unvalidated_dataset(client, mock_db_session, mock_user):
    mock_dataset = Dataset(id=uuid4(), user_id=mock_user.id, status="uploaded")
    
    mock_db_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_dataset)
    
    job_data = {
        "dataset_id": str(mock_dataset.id),
        "base_model": "gemini-1.0-pro-002",
        "hyperparameters": {"epochs": 3, "learning_rate_multiplier": 1.0, "adapter_size": 4}
    }
    
    response = await client.post("/api/v1/jobs/", json=job_data)
    
    assert response.status_code == 400
    assert "must be validated" in response.json()["detail"]
