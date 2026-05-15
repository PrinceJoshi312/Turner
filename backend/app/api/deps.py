from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login") if hasattr(settings, "API_V1_STR") else OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

import logging
from uuid import UUID

logger = logging.getLogger(__name__)

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.error("Token payload missing 'sub'")
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise credentials_exception
    
    try:
        # Explicitly convert string sub to UUID object for comparison
        user_uuid = UUID(token_data.sub)
        result = await db.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()
    except ValueError:
        logger.error(f"Invalid UUID format in token: {token_data.sub}")
        raise credentials_exception
    
    if user is None:
        logger.error(f"User not found in DB: {token_data.sub}")
        raise credentials_exception
    return user
