from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import market, screener, stock, archive
from app.scheduler import scheduler, setup_scheduler
import contextlib

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    setup_scheduler()
    yield
    scheduler.shutdown()

app = FastAPI(title="SUPGEUK WAR API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api/v1/market", tags=["Market"])
app.include_router(screener.router, prefix="/api/v1/screener", tags=["Screener"])
app.include_router(stock.router, prefix="/api/v1/stock", tags=["Stock"])
app.include_router(archive.router, prefix="/api/v1/archive", tags=["Archive"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
