
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db import get_db
from app.cache import clear_cache_pattern

router = APIRouter()

@router.get("/fix-all")
async def fix_all(db: AsyncSession = Depends(get_db)):
    # 1. DB Text Cleanup (Raw SQL to ensure it reaches the DB)
    replacements = [
        ("Type A(쌍끌이 설거지)", "동반 분산 매도(Type A)"),
        ("Type B(쌍끌이 매수)", "동반 매집 구간(Type B)"),
        ("Type C(개미털기)", "외인 단독 유입(Type C)"),
        ("Type D(기관 방어)", "기관 방어 우위(Type D)"),
        ("쌍끌이 설거지", "동반 분산 매도"),
        ("쌍끌이 매수", "동반 매집 구간"),
        ("개미털기", "외인 단독 유입"),
        ("기관 방어", "기관 방어 우위"),
    ]
    
    logs = []
    try:
        for old, new in replacements:
            query = text("UPDATE market_summary SET market_brief_text = REPLACE(market_brief_text, :old, :new) WHERE market_brief_text LIKE :like_pattern")
            await db.execute(query, {"old": old, "new": new, "like_pattern": f"%{old}%"})
        await db.commit()
        logs.append("DB Text Cleanup: Success")
    except Exception as e:
        logs.append(f"DB Text Cleanup Error: {str(e)}")

    # 2. Clear Redis Cache
    try:
        await clear_cache_pattern("*")
        logs.append("Cache Clear: Success")
    except Exception as e:
        logs.append(f"Cache Clear Error: {str(e)}")

    return {
        "status": "ok",
        "message": "Maintenance completed",
        "details": logs
    }
