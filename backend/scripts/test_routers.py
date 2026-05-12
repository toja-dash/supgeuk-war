import asyncio
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.main import app

client = TestClient(app)

def run_tests():
    print("Testing /api/v1/market/brief")
    res = client.get("/api/v1/market/brief?date=2026-05-08")
    print(res.json())
    
    print("\nTesting /api/v1/market/sectors")
    res = client.get("/api/v1/market/sectors?date=2026-05-08")
    print(res.json())
    
    print("\nTesting /api/v1/market/signals")
    res = client.get("/api/v1/market/signals?date=2026-05-08")
    print(res.json())
    
    print("\nTesting /api/v1/screener")
    res = client.get("/api/v1/screener?date=2026-05-08&type=B")
    print(res.json())
    
    print("\nTesting /api/v1/stock/005930")
    res = client.get("/api/v1/stock/005930?date=2026-05-08")
    print(res.json())
    
    print("\nTesting /api/v1/stock/005930/flows")
    res = client.get("/api/v1/stock/005930/flows?days=5")
    print(res.json())

if __name__ == "__main__":
    run_tests()
