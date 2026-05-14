import redis.asyncio as redis
import os
import json

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380/0")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def set_cache(key: str, value: dict | list, ttl_seconds: int = 86400):
    await redis_client.setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))

async def get_cache(key: str):
    data = await redis_client.get(key)
    if data:
        return json.loads(data)
    return None

async def clear_cache_pattern(pattern: str) -> int:
    deleted = 0
    async for key in redis_client.scan_iter(match=pattern):
        deleted += await redis_client.delete(key)
    return deleted
