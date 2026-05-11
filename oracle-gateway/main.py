from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import hashlib
import json
import os

app = FastAPI()

class Invoice(BaseModel):
    tx_id: str
    student_id: Optional[str] = None
    amount: Optional[float] = None
    channel: str
    timestamp: str

LOG_FILE = "../data/ingestion_chain.log"

def get_last_hash():
    if not os.path.exists(LOG_FILE):
        return "0" * 64
    with open(LOG_FILE, "r") as f:
        lines = f.readlines()
        if not lines:
            return "0" * 64
        last_line = lines[-1].strip()
        # Ensure we hash only the string content
        return hashlib.sha256(last_line.encode('utf-8')).hexdigest()

@app.post("/ingest")
async def ingest(invoice: Invoice):
    if invoice.amount is None or invoice.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if not invoice.student_id or not invoice.student_id.startswith("STU"):
        raise HTTPException(status_code=400, detail="Invalid or missing student_id")

    prev_hash = get_last_hash()
    log_entry = {
        "prev_hash": prev_hash,
        "data": invoice.model_dump()
    }
    
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    return {"status": "success", "tx_id": invoice.tx_id}
