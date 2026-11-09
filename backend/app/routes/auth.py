from fastapi import APIRouter, Depends

from app.core.security import get_current_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Authenticated successfully.",
        "user": current_user,
    }
