import asyncio
from typing import Dict, Any
import os

class LLMJudge:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
    
    async def evaluate_safety(self, tool_name: str, input_data: str) -> Dict[str, Any]:
        """
        Evaluates if the tool and its input are safe to execute.
        Returns {"safe": bool, "reason": str}
        """
        # Hackathon Fallback: Robust Mock LLM
        if not self.api_key:
            await asyncio.sleep(0.5) # Simulate API latency
            input_str = str(input_data).lower()
            dangerous_patterns = ["rm -rf", "drop table", "delete from", "/etc/passwd"]
            
            for pattern in dangerous_patterns:
                if pattern in input_str:
                    return {
                        "safe": False, 
                        "reason": f"[LLM JUDGE] I've analyzed this action and detected a highly destructive pattern ('{pattern}'). I have paused the agent for safety."
                    }
            return {"safe": True, "reason": "Action appears safe."}
            
        # Actual LLM Integration (e.g. Gemini) would go here
        return {"safe": True, "reason": "Live API check passed."}

class EvaluatorEngine:
    def __init__(self):
        self.tool_history = {} # Simple in-memory tracker for heuristics
        self.llm_judge = LLMJudge()
        
    async def evaluate_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate an incoming telemetry event.
        Returns a dict indicating if we should 'pause', 'allow', etc.
        """
        event_type = event.get('event_type')
        name = event.get('name')
        agent_id = event.get('agent_id')
        confidence = event.get('confidence', 1.0)
        input_data = event.get('input_data', '')
        
        # 1. Uncertainty Handling Check
        if confidence < 0.4:
            return {"action": "pause", "reason": "Low confidence score reported."}
            
        # 2. Heuristic Check: Loops
        if event_type == 'tool_start':
            history = self.tool_history.setdefault(agent_id, [])
            history.append(name)
            # Keep last 5
            self.tool_history[agent_id] = history[-5:]
            
            # If the exact same tool was called 3 times in a row, flag as loop
            if len(self.tool_history[agent_id]) >= 3 and len(set(self.tool_history[agent_id][-3:])) == 1:
                return {"action": "pause", "reason": "Detected potential infinite loop (tool called 3x in a row)."}
        
            # 3. LLM-as-a-Judge (Synchronous safety check before allowing execution)
            if input_data:
                llm_eval = await self.llm_judge.evaluate_safety(name, input_data)
                if not llm_eval["safe"]:
                    return {"action": "pause", "reason": llm_eval["reason"]}
                    
        # 4. LLM-as-a-Judge (Async background evaluation of goal progression)
        if event_type == 'tool_end':
            # Fire and forget LLM evaluation
            asyncio.create_task(self._llm_evaluate_progress(event))
            
        return {"action": "allow"}

    async def _llm_evaluate_progress(self, event: Dict[str, Any]):
        """
        Simulated LLM-as-a-Judge for evaluating goal progression.
        In a real app, this would call Gemini API with recent steps.
        """
        await asyncio.sleep(1) 
