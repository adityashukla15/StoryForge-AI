import ipaddress
from functools import lru_cache
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


def validate_allowed_origins(app_env: str, configured_origins: str) -> list[str]:
    origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    if not origins:
        raise ValueError("ALLOWED_ORIGINS must contain at least one valid origin.")

    is_production = app_env.casefold() == "production"
    for origin in origins:
        if "*" in origin or origin == "null":
            raise ValueError("Wildcard and opaque CORS origins are not allowed.")

        try:
            parsed = urlsplit(origin)
            hostname = parsed.hostname
            port = parsed.port
        except ValueError as error:
            raise ValueError("ALLOWED_ORIGINS contains an invalid origin.") from error

        if (
            parsed.scheme not in {"http", "https"}
            or not hostname
            or parsed.username is not None
            or parsed.password is not None
            or origin != f"{parsed.scheme}://{parsed.netloc}"
            or parsed.netloc != parsed.netloc.lower()
        ):
            raise ValueError("ALLOWED_ORIGINS must contain exact HTTP(S) origins.")

        if (parsed.scheme == "http" and port == 80) or (
            parsed.scheme == "https" and port == 443
        ):
            raise ValueError(
                "ALLOWED_ORIGINS must omit default ports for exact matching."
            )

        if is_production:
            try:
                address = ipaddress.ip_address(hostname)
            except ValueError:
                address = None

            local_hostname = (
                hostname.rstrip(".").casefold() == "localhost"
                or hostname.casefold().endswith(".localhost")
            )
            local_address = address is not None and (
                address.is_loopback or address.is_unspecified
            )
            if parsed.scheme != "https" or local_hostname or local_address:
                raise ValueError(
                    "Production ALLOWED_ORIGINS must be approved HTTPS origins."
                )

    return origins


class Settings(BaseSettings):
    APP_NAME: str = "StoryForge AI API"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return validate_allowed_origins(self.APP_ENV, self.ALLOWED_ORIGINS)


def validate_production_settings(config: Settings) -> None:
    environment = config.APP_ENV.casefold()
    if environment not in {"development", "production", "test"}:
        raise ValueError("APP_ENV must be development, test, or production.")

    if environment != "production":
        return

    required_settings = {
        "SUPABASE_URL": config.SUPABASE_URL,
        "SUPABASE_ANON_KEY": config.SUPABASE_ANON_KEY,
        "SUPABASE_SERVICE_ROLE_KEY": config.SUPABASE_SERVICE_ROLE_KEY,
        "GEMINI_API_KEY": config.GEMINI_API_KEY,
    }
    missing = [
        name
        for name, value in required_settings.items()
        if not value.strip()
    ]
    if missing:
        raise ValueError(
            "Production configuration is missing required settings: "
            + ", ".join(missing)
        )

    try:
        supabase_url = urlsplit(config.SUPABASE_URL)
        supabase_host = supabase_url.hostname
        supabase_url.port
    except ValueError as error:
        raise ValueError("Production SUPABASE_URL must be a valid HTTPS URL.") from error
    if (
        supabase_url.scheme != "https"
        or not supabase_host
        or supabase_url.username is not None
        or supabase_url.password is not None
        or supabase_url.query
        or supabase_url.fragment
    ):
        raise ValueError("Production SUPABASE_URL must be a valid HTTPS URL.")

    config.allowed_origins_list


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()