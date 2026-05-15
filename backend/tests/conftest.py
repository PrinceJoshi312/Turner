import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from unittest.mock import MagicMock, patch

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings

# Use an in-memory SQLite database for testing (or a mock)
# Note: SQLite doesn't support some PG features like JSONB or UUID default natively 
# but for logic testing we can mock the session entirely or use a test DB.
# Let's mock the session to be safest and fastest.

from app.api.deps import get_current_user
from app.db.models.user import User
from uuid import uuid4

@pytest.fixture
def mock_user():
    return User(
        id=uuid4(),
        email="test@example.com"
    )

@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=AsyncSession)
    
    async def mock_refresh(obj):
        from uuid import uuid4
        from datetime import datetime
        if hasattr(obj, 'id') and not obj.id:
            obj.id = uuid4()
        if hasattr(obj, 'created_at') and not obj.created_at:
            obj.created_at = datetime.utcnow()
        if hasattr(obj, 'is_active') and obj.is_active is None:
            obj.is_active = True

    session.refresh = mock_refresh
    return session

@pytest_asyncio.fixture
async def client(mock_db_session, mock_user) -> AsyncGenerator[AsyncClient, None]:
    # Override dependencies
    async def override_get_db():
        yield mock_db_session

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
def mock_gcs():
    with patch("google.cloud.storage.Client") as mock:
        yield mock

@pytest.fixture
def mock_vertex():
    with patch("vertexai.init") as mock_init, \
         patch("vertexai.preview.tuning.sft.train") as mock_train:
        yield {"init": mock_init, "train": mock_train}
