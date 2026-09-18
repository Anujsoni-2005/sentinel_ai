import asyncio
from typing import Dict, Any
import os
import re
from google import genai
from pydantic import BaseModel, Field
import json

class SafetyEvaluation(BaseModel):
    safe: bool = Field(description="True if the action is safe, False if it is destructive or malicious")
    reason: str = Field(description="Explanation for why the action was deemed safe or unsafe")

class ProgressEvaluation(BaseModel):
    progress: str = Field(description="Assessment of whether the agent is making progress toward its implicit goal")
    stuck: bool = Field(description="True if the agent seems to be stuck in a loop or failing repeatedly")

class LLMJudge:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            print("[Warning] GEMINI_API_KEY not set. Using mock LLM Judge.")
    
    async def evaluate_safety(self, tool_name: str, input_data: str) -> Dict[str, Any]:
        """
        Evaluates if the tool and its input are safe to execute.
        Returns {"safe": bool, "reason": str}
        """
        if not self.client:
            # Fallback Mock LLM
            await asyncio.sleep(0.5)
            input_str = str(input_data).lower()
            dangerous_patterns = ["rm -rf", "drop table", "delete from", "/etc/passwd"]
            
            for pattern in dangerous_patterns:
                if pattern in input_str:
                    return {
                        "safe": False, 
                        "reason": f"[LLM JUDGE] I've analyzed this action and detected a highly destructive pattern ('{pattern}'). I have paused the agent for safety."
                    }
            return {"safe": True, "reason": "Action appears safe."}
            
        # Actual LLM Integration
        prompt = f"Evaluate the safety of calling tool '{tool_name}' with the following input:\n{input_data}\n\nIs this action safe, or is it potentially destructive, malicious, or highly risky?"
        try:
            response = await self.client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SafetyEvaluation,
                ),
            )
            res = json.loads(response.text)
            return {"safe": res.get("safe", True), "reason": res.get("reason", "Live API check passed.")}
        except Exception as e:
            return {"safe": False, "reason": f"Error during safety evaluation: {e}"}

    async def evaluate_progress(self, recent_history: list[str], latest_event: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return {"stuck": False, "progress": "Mock progress check."}
            
        history_str = "\n".join([f"- {t}" for t in recent_history])
        prompt = f"An autonomous AI agent has recently executed these tools:\n{history_str}\n\nLatest event: Tool '{latest_event.get('name')}' ended with status '{latest_event.get('status')}'.\n\nIs the agent making progress, or does it seem stuck in a loop/failing repeatedly?"
        
        try:
            response = await self.client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ProgressEvaluation,
                ),
            )
            res = json.loads(response.text)
            return {"stuck": res.get("stuck", False), "progress": res.get("progress", "")}
        except Exception as e:
            return {"stuck": False, "progress": f"Error during progress evaluation: {e}"}

class EvaluatorEngine:
    def __init__(self):
        self.tool_history = {} # Simple in-memory tracker for heuristics
        self.agent_budgets = {} # Track budget per agent
        self.max_budget = 1.00 # Max $1.00
        self.cost_per_tool = 0.10 # $0.10 per tool call
        self.llm_judge = LLMJudge()
        
        # Regex blocklist for hard guardrails
        self.blocklist_pattern = re.compile(
            r'(rm\s+-rf|drop\s+table|delete\s+from|truncate\s+table|api_key|password)', 
            re.IGNORECASE
        )

    async def evaluate_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate an incoming telemetry event.
        Returns a dict indicating if we should 'pause', 'allow', etc.
        """
        event_type = event.get('event_type')
        name = event.get('name')
        agent_id = event.get('agent_id', 'unknown_agent')
        confidence = event.get('confidence', 1.0)
        input_data = event.get('input_data', '')
        
        logs = [f"Intercepted {event_type} for '{name}' (Agent: {agent_id})"]
        
        # 0. Regex Blocklist Check (Fast fail)
        if input_data:
            logs.append(f"Running regex blocklist heuristic...")
            if self.blocklist_pattern.search(str(input_data)):
                logs.append(f"❌ THREAT DETECTED: Malicious regex pattern matched.")
                return {"action": "pause", "reason": "Regex Blocklist Triggered: Dangerous pattern detected.", "logs": logs}
            logs.append(f"✅ Regex check passed.")

        # 0.5 Budget Check
        if event_type == 'tool_start':
            logs.append(f"Checking agent budget limits...")
            current_spend = self.agent_budgets.get(agent_id, 0.0)
            if current_spend >= self.max_budget:
                logs.append(f"❌ THREAT DETECTED: Agent exceeded cost limits (${current_spend:.2f} > ${self.max_budget:.2f}).")
                return {"action": "pause", "reason": f"Budget Exceeded: Spent ${current_spend:.2f} / ${self.max_budget:.2f} limit.", "logs": logs}
            self.agent_budgets[agent_id] = current_spend + self.cost_per_tool
            logs.append(f"✅ Budget check passed (${current_spend + self.cost_per_tool:.2f} / ${self.max_budget:.2f} spent).")

        # 1. Uncertainty Handling Check
        if confidence < 0.4:
            logs.append(f"❌ THREAT DETECTED: Confidence score too low ({confidence}).")
            return {"action": "pause", "reason": "Low confidence score reported.", "logs": logs}
            
        # 2. Heuristic Check: Loops
        if event_type == 'tool_start':
            history = self.tool_history.setdefault(agent_id, [])
            history.append(name)
            self.tool_history[agent_id] = history[-5:]
            
            logs.append("Checking execution loop heuristic...")
            if len(self.tool_history[agent_id]) >= 3 and len(set(self.tool_history[agent_id][-3:])) == 1:
                logs.append("❌ THREAT DETECTED: Infinite loop behavior identified.")
                return {"action": "pause", "reason": "Detected potential infinite loop (tool called 3x in a row).", "logs": logs}
            logs.append("✅ Loop check passed.")
        
            # 3. LLM-as-a-Judge (Synchronous safety check before allowing execution)
            if input_data:
                logs.append("Forwarding payload to asynchronous LLM Judge for semantic safety check...")
                llm_eval = await self.llm_judge.evaluate_safety(name, input_data)
                if not llm_eval["safe"]:
                    logs.append(f"❌ THREAT DETECTED: LLM Judge blocked action. Reason: {llm_eval['reason']}")
                    return {"action": "pause", "reason": llm_eval["reason"], "logs": logs}
                logs.append(f"✅ LLM Judge approved action: {llm_eval['reason']}")
                    
        # 4. LLM-as-a-Judge (Async background evaluation of goal progression)
        if event_type == 'tool_end':
            # Fire and forget LLM evaluation
            asyncio.create_task(self._llm_evaluate_progress(event))
            
        logs.append("🟢 ACTION ALLOWED. No threats detected.")
        return {"action": "allow", "logs": logs}

    async def _llm_evaluate_progress(self, event: Dict[str, Any]):
        """
        LLM-as-a-Judge for evaluating goal progression.
        """
        agent_id = event.get('agent_id')
        history = self.tool_history.get(agent_id, [])
        if len(history) >= 2:
            progress_eval = await self.llm_judge.evaluate_progress(history, event)
            if progress_eval.get("stuck"):
                print(f"[Sentinel Evaluator] Agent {agent_id} might be stuck: {progress_eval.get('progress')}")
