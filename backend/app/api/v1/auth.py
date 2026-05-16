from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import UserCreate, UserResponse, Token
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate, UserResponse, Token, UserMe
from app.api.deps import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    return await AuthService.register(db, user_in)


@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await AuthService.authenticate(db, form_data.username, form_data.password)
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )

@router.get("/me", response_model=UserMe)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the current authenticated user.
    Used by the frontend to verify token validity.
    """
    return current_user

