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

@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=AsyncSession)
    return session

@pytest_asyncio.fixture
async def client(mock_db_session) -> AsyncGenerator[AsyncClient, None]:
    # Override get_db dependency
    async def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db
    
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
