from typing import Any, Dict, List, Optional
from uuid import UUID
from langchain_core.callbacks import BaseCallbackHandler
from .client import SentinelClient
from .tracer import TracerConfig
import uuid

class SentinelLangChainCallback(BaseCallbackHandler):
    """
    A LangChain callback handler that translates LangChain events 
    into SentinelAI telemetry for DAG/trace tree visualization.
    """
    def __init__(self, agent_id: str):
        self.client = SentinelClient(agent_id)
        self.run_map = {} # Maps LangChain run_id to our span_id
        
    def _send(self, run_id: UUID, parent_run_id: Optional[UUID], event_type: str, 
              name: str, input_data: any, output_data: any, status: str):
              
        span_id = self.run_map.get(run_id)
        if not span_id:
            span_id = str(uuid.uuid4())
            self.run_map[run_id] = span_id
            
        parent_span_id = self.run_map.get(parent_run_id) if parent_run_id else None
        
        # If there's no active trace, start one. If there is, use it.
        trace_id = TracerConfig.current_trace_id
        if not trace_id:
            trace_id = str(uuid.uuid4())
            TracerConfig.current_trace_id = trace_id
            
        self.client.send_event(
            event_type=event_type,
            trace_id=trace_id,
            parent_span_id=parent_span_id,
            span_id=span_id,
            name=name,
            input_data=input_data,
            output_data=output_data,
            confidence=1.0,
            status=status
        )

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any) -> Any:
        self._send(kwargs.get("run_id"), kwargs.get("parent_run_id"), "llm_start", "LLM Call", prompts, None, "running")

    def on_llm_end(self, response: Any, **kwargs: Any) -> Any:
        self._send(kwargs.get("run_id"), kwargs.get("parent_run_id"), "llm_end", "LLM Call", None, response.dict(), "success")
        
    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs: Any) -> Any:
        name = serialized.get("name", "tool")
        self._send(kwargs.get("run_id"), kwargs.get("parent_run_id"), "tool_start", name, input_str, None, "running")

    def on_tool_end(self, output: str, **kwargs: Any) -> Any:
        self._send(kwargs.get("run_id"), kwargs.get("parent_run_id"), "tool_end", "tool", None, output, "success")
