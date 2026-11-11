import logging
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import File, Form, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.security import get_current_user
from app.models.chapter import ChapterCreate, ChapterUpdate
from app.rag.indexer import index_chapter
from app.services import chapter_service
from app.utils.file_parser import extract_text_from_upload


router = APIRouter(tags=["Chapters"])
logger = logging.getLogger(__name__)


async def _index_saved_chapter(
    chapter: dict,
    user_id: str,
    project_id: UUID,
) -> dict:
    try:
        result = await run_in_threadpool(
            index_chapter,
            user_id,
            project_id,
            UUID(chapter["id"]),
        )
        indexing_status = result.get("status")
        if indexing_status not in {"indexed", "not_applicable"}:
            indexing_status = "failed"
            logger.warning(
                "Chapter indexing did not complete",
                extra={"indexing_status": indexing_status},
            )
    except Exception as error:
        indexing_status = "failed"
        logger.warning(
            "Chapter indexing failed",
            extra={
                "indexing_status": indexing_status,
                "error_type": type(error).__name__,
            },
        )

    return {**chapter, "indexing_status": indexing_status}


@router.post(
    "/projects/{project_id}/chapters",
    status_code=status.HTTP_201_CREATED,
)
async def create_new_chapter(
    project_id: UUID,
    chapter: ChapterCreate,
    current_user: dict = Depends(get_current_user),
):
    if not chapter_service.verify_project_ownership(
        current_user["id"], project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    saved_chapter = chapter_service.create_chapter(
        current_user["id"],
        project_id,
        chapter.model_dump(),
    )
    return await _index_saved_chapter(
        saved_chapter,
        current_user["id"],
        project_id,
    )


@router.get("/projects/{project_id}/chapters")
async def get_project_chapters(
    project_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    if not chapter_service.verify_project_ownership(
        current_user["id"], project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return chapter_service.list_chapters(
        current_user["id"],
        project_id,
    )


@router.get("/chapters/{chapter_id}")
async def get_chapter_details(
    chapter_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    chapter = chapter_service.get_chapter(
        current_user["id"],
        chapter_id,
    )

    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found.",
        )

    return chapter


@router.patch("/chapters/{chapter_id}")
async def update_chapter_details(
    chapter_id: UUID,
    chapter: ChapterUpdate,
    current_user: dict = Depends(get_current_user),
):
    update_data = chapter.model_dump(exclude_unset=True)
    updated_chapter = chapter_service.update_chapter(
        current_user["id"],
        chapter_id,
        update_data,
    )

    if not updated_chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found.",
        )

    if "content" not in update_data:
        return updated_chapter

    return await _index_saved_chapter(
        updated_chapter,
        current_user["id"],
        UUID(updated_chapter["project_id"]),
    )


@router.delete("/chapters/{chapter_id}")
async def remove_chapter(
    chapter_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    deleted_chapter = chapter_service.delete_chapter(
        current_user["id"],
        chapter_id,
    )

    if not deleted_chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found.",
        )

    return {
        "message": "Chapter deleted successfully.",
        "chapter_id": deleted_chapter["id"],
    }
@router.post(
    "/projects/{project_id}/chapters/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_new_chapter(
    project_id: UUID,
    title: str = Form(...),
    chapter_number: int | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    # Verify project ownership
    if not chapter_service.verify_project_ownership(user_id, project_id):
        raise HTTPException(status_code=404, detail="Project not found.")

    # Validate file and extract text
    file_bytes, extracted_text, extension = await extract_text_from_upload(file)

    # Validate chapter fields
    chapter_data = ChapterCreate(
        title=title,
        content=extracted_text,
        chapter_number=chapter_number,
    )

    chapter_id = uuid4()
    uploaded_file_path = None

    try:
        # Upload original file to Supabase Storage
        uploaded_file_path = chapter_service.upload_chapter_file(
            user_id=user_id,
            project_id=project_id,
            chapter_id=chapter_id,
            file_bytes=file_bytes,
            extension=extension,
        )

        # Save extracted content and Storage path in database
        payload = chapter_data.model_dump()
        payload["id"] = str(chapter_id)
        payload["file_path"] = uploaded_file_path

        chapter = chapter_service.create_chapter(
            user_id,
            project_id,
            payload,
        )

    except Exception:
        # Roll back uploaded file if database insertion fails
        if uploaded_file_path:
            try:
                chapter_service.delete_chapter_file(uploaded_file_path)
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail="Unable to upload chapter. Please try again.",
        )

    return await _index_saved_chapter(chapter, user_id, project_id)
