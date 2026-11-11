import asyncio
import logging

import pytest

from app.core.config import (
    Settings,
    settings,
    validate_allowed_origins,
    validate_production_settings,
)
from app.services import embedding_service
from app.main import app, lifespan


def _production_settings(**overrides) -> Settings:
    values = {
        "APP_ENV": "production",
        "ALLOWED_ORIGINS": "https://stories.example.test",
        "SUPABASE_URL": "https://project.supabase.co",
        "SUPABASE_ANON_KEY": "test-anon",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-role",
        "GEMINI_API_KEY": "test-gemini",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.mark.parametrize(
    "setting_name",
    [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
    ],
)
def test_production_settings_require_supabase_and_gemini_configuration(setting_name):
    config = _production_settings(**{setting_name: ""})
    with pytest.raises(ValueError, match=setting_name):
        validate_production_settings(config)


def test_production_settings_require_valid_explicit_https_origins():
    config = _production_settings(ALLOWED_ORIGINS="")

    with pytest.raises(ValueError, match="ALLOWED_ORIGINS"):
        validate_production_settings(config)

    with pytest.raises(ValueError, match="Wildcard"):
        validate_allowed_origins("production", "https://stories.example.test, *")

    with pytest.raises(ValueError, match="HTTPS"):
        validate_allowed_origins("production", "http://stories.example.test")
    with pytest.raises(ValueError, match="approved HTTPS"):
        validate_allowed_origins("production", "https://127.0.0.2")
    with pytest.raises(ValueError, match="default ports"):
        validate_allowed_origins(
            "production",
            "https://stories.example.test:443",
        )

    assert validate_allowed_origins(
        "production",
        "https://stories.example.test,https://writer.example.test",
    ) == [
        "https://stories.example.test",
        "https://writer.example.test",
    ]


def test_complete_production_settings_pass_validation():
    validate_production_settings(_production_settings())


def test_development_origins_remain_explicit_and_localhost_is_supported():
    assert validate_allowed_origins(
        "development",
        "http://localhost:3000",
    ) == ["http://localhost:3000"]

    with pytest.raises(ValueError, match="exact HTTP"):
        validate_allowed_origins("development", "https://example.test/path")
    with pytest.raises(ValueError, match="exact HTTP"):
        validate_allowed_origins("development", "https://example.test?")


def test_production_supabase_url_must_use_https():
    config = _production_settings(SUPABASE_URL="http://project.supabase.co")

    with pytest.raises(ValueError, match="SUPABASE_URL"):
        validate_production_settings(config)


def test_unknown_application_environment_fails_validation():
    config = Settings(_env_file=None, APP_ENV="prod")

    with pytest.raises(ValueError, match="APP_ENV"):
        validate_production_settings(config)


def test_application_startup_rejects_missing_production_secrets(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    for name in (
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
    ):
        monkeypatch.setattr(settings, name, "")

    async def start_application():
        async with lifespan(app):
            pass

    with pytest.raises(ValueError, match="required settings"):
        asyncio.run(start_application())


def test_gemini_client_uses_an_explicit_timeout_without_changing_models(monkeypatch):
    created = {}
    client = object()
    model_before = embedding_service.settings.GEMINI_MODEL
    embedding_model_before = embedding_service.settings.GEMINI_EMBEDDING_MODEL
    dimensions_before = embedding_service.settings.EMBEDDING_DIMENSIONS

    def fake_client(**kwargs):
        created.update(kwargs)
        return client

    monkeypatch.setattr(embedding_service.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(embedding_service.genai, "Client", fake_client)
    embedding_service.get_gemini_client.cache_clear()
    try:
        assert embedding_service.get_gemini_client() is client
    finally:
        embedding_service.get_gemini_client.cache_clear()

    assert created["http_options"].timeout == 60_000
    assert embedding_service.settings.GEMINI_MODEL == model_before
    assert embedding_service.settings.GEMINI_EMBEDDING_MODEL == embedding_model_before
    assert embedding_service.settings.EMBEDDING_DIMENSIONS == dimensions_before


def test_chat_failure_logs_only_safe_structured_metadata(
    client,
    auth_headers,
    monkeypatch,
    caplog,
):
    from app.routes import chat

    project_id = client.post(
        "/api/projects/",
        headers=auth_headers,
        json={"title": "Logging test"},
    ).json()["id"]

    def fail_retrieval(**_kwargs):
        raise RuntimeError("sensitive provider response")

    monkeypatch.setattr(chat, "search_project_chunks", fail_retrieval)
    with caplog.at_level(logging.ERROR, logger="app.routes.chat"):
        response = client.post(
            f"/api/projects/{project_id}/chat",
            headers=auth_headers,
            json={"question": "private question text"},
        )

    assert response.status_code == 503
    assert len(caplog.records) == 1
    assert caplog.records[0].failure_stage == "retrieval"
    assert caplog.records[0].error_type == "RuntimeError"
    assert "private question text" not in caplog.text
    assert "sensitive provider response" not in caplog.text


def test_cors_preflight_allows_local_authenticated_api_headers(client, auth_headers):
    response = client.options(
        "/api/projects/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "POST" in response.headers["access-control-allow-methods"]
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers
    assert "access-control-allow-credentials" not in response.headers

    authenticated = client.get(
        "/api/auth/me",
        headers={
            **auth_headers,
            "Origin": "http://localhost:3000",
        },
    )
    assert authenticated.status_code == 200
    assert authenticated.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_rejects_an_unconfigured_origin(client, auth_headers):
    preflight = client.options(
        "/api/auth/me",
        headers={
            "Origin": "https://unlisted.example.test",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers

    request = client.get(
        "/api/auth/me",
        headers={
            **auth_headers,
            "Origin": "https://unlisted.example.test",
        },
    )
    assert request.status_code == 200
    assert "access-control-allow-origin" not in request.headers
