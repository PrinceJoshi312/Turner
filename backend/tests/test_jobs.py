import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from app.db.models.dataset import Dataset
from app.db.models.user import User

@pytest.mark.asyncio
async def test_create_job_success(client, mock_db_session, mock_vertex):
    # Setup mocks
    mock_user = User(id=uuid4(), email="test@example.com")
    mock_dataset = Dataset(id=uuid4(), user_id=mock_user.id, status="validated", gcs_uri="gs://bucket/data.jsonl")
    
    # Mock get_current_user dependency and DB checks
    with patch("app.api.deps.get_current_user", return_value=mock_user):
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
        
        response = await client.post("/api/v1/jobs/", json=job_data)
        
        assert response.status_code == 201
        assert response.json()["status"] == "queued"
        assert mock_vertex["train"].called
        assert mock_db_session.commit.called

@pytest.mark.asyncio
async def test_create_job_unvalidated_dataset(client, mock_db_session):
    mock_user = User(id=uuid4(), email="test@example.com")
    mock_dataset = Dataset(id=uuid4(), user_id=mock_user.id, status="uploaded")
    
    with patch("app.api.deps.get_current_user", return_value=mock_user):
        mock_db_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_dataset)
        
        job_data = {
            "dataset_id": str(mock_dataset.id),
            "base_model": "gemini-1.0-pro-002",
            "hyperparameters": {"epochs": 3, "learning_rate_multiplier": 1.0, "adapter_size": 4}
        }
        
        response = await client.post("/api/v1/jobs/", json=job_data)
        
        assert response.status_code == 400
        assert "must be validated" in response.json()["detail"]
