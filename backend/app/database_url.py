import os


DEFAULT_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/supgeuk_war"


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url
