from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.projects import router as projects_router
from app.routes.chapters import router as chapters_router

from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for StoryForge AI storytelling platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    projects_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    chapters_router,
    prefix=settings.API_PREFIX,
)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to StoryForge AI API",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "storyforge-backend",
        "environment": settings.APP_ENV,
    }
