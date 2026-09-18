from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, Dict
import uvicorn
from .db import init_db, save_event, get_status, update_status
from .evaluator import EvaluatorEngine

app = FastAPI(title="SentinelAI Monitoring Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = EvaluatorEngine()
firewall_logs_history = []
current_threat_level = 0.0

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/api/telemetry")
async def receive_telemetry(request: Request):
    global firewall_logs_history, current_threat_level
    event = await request.json()
    
    # 1. Run Evaluator checks
    eval_result = await evaluator.evaluate_event(event)
    
    # Append logs
    if "logs" in eval_result:
        for log in eval_result["logs"]:
            import datetime
            ts = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
            firewall_logs_history.append(f"[{ts}] {log}")
        
        # Keep last 100 logs
        if len(firewall_logs_history) > 100:
            firewall_logs_history = firewall_logs_history[-100:]
            
    # Update threat level
    if eval_result.get("action") == "pause":
        current_threat_level = 100.0
    else:
        # Decay threat level slowly if allowed
        current_threat_level = max(0.0, current_threat_level - 5.0)
    
    # 2. Update status if Evaluator wants to pause
    if eval_result.get("action") == "pause":
        event["status"] = "paused"
        if "metadata" not in event or not event["metadata"]:
            event["metadata"] = {}
        event["metadata"]["pause_reason"] = eval_result.get("reason", "Unknown")
        
    # 3. Save to DB
    save_event(event)
    
    return eval_result

@app.get("/api/telemetry/{span_id}/status")
async def check_status(span_id: str):
    status = get_status(span_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Span not found")
    return {"status": status}

class ApprovalRequest(BaseModel):
    action: str # "approve" or "reject"

@app.post("/api/intervention/{span_id}")
async def handle_intervention(span_id: str, req: ApprovalRequest):
    """ Endpoint for the Web Dashboard to Approve/Reject paused actions """
    if req.action == "approve":
        update_status(span_id, "approved")
    elif req.action == "reject":
        update_status(span_id, "rejected")
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    return {"success": True, "new_status": req.action}

@app.get("/api/traces")
async def get_traces():
    """ Endpoint for Dashboard to fetch trace trees """
    import sqlite3
    conn = sqlite3.connect("sentinel.db")
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT * FROM traces ORDER BY timestamp ASC")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    
    # Parse json fields
    import json
    for r in rows:
        r['metadata'] = json.loads(r['metadata']) if r['metadata'] else {}
    
    return {"traces": rows}

@app.get("/api/stats")
async def get_stats():
    """ Endpoint for Dashboard to fetch real-time budget, logs, and threat level """
    # Get budget for db-admin-agent or fallback to 0
    budget_spent = evaluator.agent_budgets.get("db-admin-agent", 0.0)
    
    return {
        "budget": {
            "spent": budget_spent,
            "max": evaluator.max_budget
        },
        "threat_level": current_threat_level,
        "logs": firewall_logs_history
    }

@app.post("/api/demo")
async def run_demo():
    """ Endpoint to trigger the hackathon_demo.py script from the dashboard """
    import subprocess
    try:
        # Run it in the background so it doesn't block the API response
        subprocess.Popen(["python", "agent/hackathon_demo.py"], cwd="/app")
        return {"success": True, "message": "Demo script started!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
