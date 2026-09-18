import os
import requests
import json
import time

SERVER_URL = os.environ.get("SENTINEL_URL", "http://localhost:8000")

class SentinelClient:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        
    def send_event(self, event_type: str, trace_id: str, parent_span_id: str, 
                   span_id: str, name: str, input_data: any, output_data: any, 
                   confidence: float, status: str, metadata: dict = None):
        
        payload = {
            "agent_id": self.agent_id,
            "event_type": event_type,
            "trace_id": trace_id,
            "parent_span_id": parent_span_id,
            "span_id": span_id,
            "name": name,
            "input_data": json.dumps(input_data) if input_data is not None else None,
            "output_data": json.dumps(output_data) if output_data is not None else None,
            "confidence": confidence,
            "status": status,
            "metadata": metadata or {},
            "timestamp": time.time()
        }
        
        try:
            response = requests.post(f"{SERVER_URL}/api/telemetry", json=payload)
            response.raise_for_status()
            
            resp_data = response.json()
            if resp_data.get("action") == "pause":
                return self.await_human_approval(span_id)
            return True
            
        except Exception as e:
            print(f"[Sentinel SDK] Error sending telemetry: {e}")
            return True # Fail open so agent isn't fully broken by monitoring

    def await_human_approval(self, span_id: str):
        print(f"\n[Sentinel SDK] Agent paused by Evaluation Engine. Waiting for Human Approval on action {span_id}...")
        while True:
            try:
                response = requests.get(f"{SERVER_URL}/api/telemetry/{span_id}/status")
                if response.status_code == 200:
                    status = response.json().get("status")
                    if status == "approved":
                        print("[Sentinel SDK] Action approved. Resuming...")
                        return True
                    elif status == "rejected":
                        print("[Sentinel SDK] Action rejected. Halting execution.")
                        return False
            except Exception:
                pass
            time.sleep(2)
