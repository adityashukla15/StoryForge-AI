from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.dashboard_service import get_dashboard_overview


router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/overview")
def dashboard_overview(
    current_user: dict = Depends(get_current_user),
):
    return get_dashboard_overview(
        user_id=current_user["id"],
    )
