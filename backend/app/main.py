from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.projects import router as projects_router
from app.routes.chapters import router as chapters_router
from app.routes.chat import router as chat_router
from app.routes.conversations import router as conversations_router
from app.routes.dashboard import router as dashboard_router

from app.core.config import settings, validate_production_settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_production_settings(settings)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for StoryForge AI storytelling platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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



app.include_router(
    chat_router,
    prefix=settings.API_PREFIX,
)
app.include_router(
    conversations_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    dashboard_router,
    prefix=settings.API_PREFIX,
)
@app.get("/", tags="Root")
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
