from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database_url import get_database_url

engine = create_async_engine(get_database_url(), echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
