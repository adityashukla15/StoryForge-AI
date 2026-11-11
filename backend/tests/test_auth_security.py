import asyncio

import httpx
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import security


class FakeResponse:
    def __init__(self, status_code: int, body: dict):
        self.status_code = status_code
        self._body = body

    def json(self) -> dict:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://supabase.example.test/auth/v1/user")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("upstream failure", request=request, response=response)


class FakeAsyncClient:
    def __init__(self, response: FakeResponse | Exception):
        self.response = response
        self.request = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, url: str, headers: dict) -> FakeResponse:
        self.request = (url, headers)
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


def credentials(token: str = "test-access-token") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_current_user_verifies_supabase_access_token(monkeypatch):
    fake_client = FakeAsyncClient(
        FakeResponse(
            200,
            {"id": "test-user-id", "email": "storyteller@example.test"},
        )
    )
    monkeypatch.setattr(security.settings, "SUPABASE_URL", "https://supabase.example.test")
    monkeypatch.setattr(security.settings, "SUPABASE_ANON_KEY", "test-anon-key")
    monkeypatch.setattr(security.httpx, "AsyncClient", lambda timeout: fake_client)

    result = asyncio.run(security.get_current_user(credentials()))

    assert result == {"id": "test-user-id", "email": "storyteller@example.test"}
    assert fake_client.request == (
        "https://supabase.example.test/auth/v1/user",
        {
            "apikey": "test-anon-key",
            "Authorization": "Bearer test-access-token",
        },
    )


def test_current_user_rejects_missing_invalid_and_unconfigured_auth(monkeypatch):
    with pytest.raises(HTTPException) as missing:
        asyncio.run(security.get_current_user(None))
    assert missing.value.status_code == 401

    monkeypatch.setattr(security.settings, "SUPABASE_URL", "")
    monkeypatch.setattr(security.settings, "SUPABASE_ANON_KEY", "")
    with pytest.raises(HTTPException) as unconfigured:
        asyncio.run(security.get_current_user(credentials()))
    assert unconfigured.value.status_code == 503

    fake_client = FakeAsyncClient(FakeResponse(401, {"message": "invalid"}))
    monkeypatch.setattr(security.settings, "SUPABASE_URL", "https://supabase.example.test")
    monkeypatch.setattr(security.settings, "SUPABASE_ANON_KEY", "test-anon-key")
    monkeypatch.setattr(security.httpx, "AsyncClient", lambda timeout: fake_client)
    with pytest.raises(HTTPException) as invalid:
        asyncio.run(security.get_current_user(credentials()))
    assert invalid.value.status_code == 401


def test_current_user_maps_auth_provider_network_failure_to_service_unavailable(monkeypatch):
    request = httpx.Request("GET", "https://supabase.example.test/auth/v1/user")
    fake_client = FakeAsyncClient(httpx.ConnectError("network unavailable", request=request))
    monkeypatch.setattr(security.settings, "SUPABASE_URL", "https://supabase.example.test")
    monkeypatch.setattr(security.settings, "SUPABASE_ANON_KEY", "test-anon-key")
    monkeypatch.setattr(security.httpx, "AsyncClient", lambda timeout: fake_client)

    with pytest.raises(HTTPException) as unavailable:
        asyncio.run(security.get_current_user(credentials()))
    assert unavailable.value.status_code == 503
    assert "network unavailable" not in unavailable.value.detail
