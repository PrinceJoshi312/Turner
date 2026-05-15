import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import select
from app.db.models.user import User
from app.core.security import get_password_hash

@pytest.mark.asyncio
async def test_register_user(client, mock_db_session):
    # Mocking that the email doesn't exist
    mock_db_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    
    user_data = {"email": "test@example.com", "password": "securepassword"}
    response = await client.post("/api/v1/auth/register", json=user_data)
    
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
    assert "id" in response.json()

@pytest.mark.asyncio
async def test_login_success(client, mock_db_session):
    # Mocking user existence and password verification
    hashed = get_password_hash("password123")
    mock_user = User(id="550e8400-e29b-41d4-a716-446655440000", email="test@example.com", hashed_password=hashed)
    
    mock_db_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_user)
    
    login_data = {"username": "test@example.com", "password": "password123"}
    # OAuth2PasswordRequestForm uses form data
    response = await client.post("/api/v1/auth/login", data=login_data)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"
