from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.project import ProjectCreate, ProjectUpdate
from app.services import project_service


router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    return project_service.create_project(
        current_user["id"],
        project.model_dump(),
    )


@router.get("/")
async def get_all_projects(
    current_user: dict = Depends(get_current_user),
):
    return project_service.list_projects(current_user["id"])


@router.get("/{project_id}")
async def get_project_details(
    project_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    project = project_service.get_project(
        current_user["id"],
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project


@router.patch("/{project_id}")
async def update_project_details(
    project_id: UUID,
    project: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    updated_project = project_service.update_project(
        current_user["id"],
        project_id,
        project.model_dump(exclude_unset=True),
    )

    if not updated_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return updated_project


@router.delete("/{project_id}")
async def remove_project(
    project_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    deleted = project_service.delete_project(
        current_user["id"],
        project_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return {
        "message": "Project deleted successfully.",
    }
