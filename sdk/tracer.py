import functools
import uuid
import inspect
from typing import Any, Callable, Optional
from .client import SentinelClient

class TracerConfig:
    client: Optional[SentinelClient] = None
    current_trace_id: Optional[str] = None
    current_span_id: Optional[str] = None

def init_tracer(agent_id: str):
    TracerConfig.client = SentinelClient(agent_id)

def trace_agent(name: str):
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if TracerConfig.client is None:
                return func(*args, **kwargs)
                
            trace_id = str(uuid.uuid4())
            span_id = str(uuid.uuid4())
            
            # Set trace context
            TracerConfig.current_trace_id = trace_id
            TracerConfig.current_span_id = span_id
            
            TracerConfig.client.send_event(
                event_type="agent_start",
                trace_id=trace_id,
                parent_span_id=None,
                span_id=span_id,
                name=name,
                input_data={"args": args, "kwargs": kwargs},
                output_data=None,
                confidence=1.0,
                status="running"
            )
            
            try:
                result = func(*args, **kwargs)
                TracerConfig.client.send_event(
                    event_type="agent_end",
                    trace_id=trace_id,
                    parent_span_id=None,
                    span_id=span_id,
                    name=name,
                    input_data=None,
                    output_data=result,
                    confidence=1.0,
                    status="success"
                )
                return result
            except Exception as e:
                TracerConfig.client.send_event(
                    event_type="agent_error",
                    trace_id=trace_id,
                    parent_span_id=None,
                    span_id=span_id,
                    name=name,
                    input_data=None,
                    output_data=str(e),
                    confidence=0.0,
                    status="error"
                )
                raise e
        return wrapper
    return decorator

def trace_tool(name: str):
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if TracerConfig.client is None or TracerConfig.current_trace_id is None:
                return func(*args, **kwargs)
                
            parent_span_id = TracerConfig.current_span_id
            span_id = str(uuid.uuid4())
            
            # Allow tool to optionally pass confidence in kwargs (we pop it to avoid passing to actual tool)
            confidence = kwargs.pop("confidence", 1.0)
            
            # Explicit Uncertainty Handling
            if confidence < 0.4:
                print(f"[Sentinel SDK] Tool {name} has low confidence ({confidence}). Intercepting...")
                payload = {
                    "reason": "low_confidence",
                    "proposed_tool": name,
                    "confidence": confidence
                }
                
                # Send event and pause immediately
                TracerConfig.client.send_event(
                    event_type="tool_start",
                    trace_id=TracerConfig.current_trace_id,
                    parent_span_id=parent_span_id,
                    span_id=span_id,
                    name=name,
                    input_data={"args": args, "kwargs": kwargs},
                    output_data=None,
                    confidence=confidence,
                    status="paused",
                    metadata=payload
                )
                
                approved = TracerConfig.client.await_human_approval(span_id)
                if not approved:
                    raise Exception(f"Action {name} rejected by human.")
            else:
                TracerConfig.client.send_event(
                    event_type="tool_start",
                    trace_id=TracerConfig.current_trace_id,
                    parent_span_id=parent_span_id,
                    span_id=span_id,
                    name=name,
                    input_data={"args": args, "kwargs": kwargs},
                    output_data=None,
                    confidence=confidence,
                    status="running"
                )

            # Execution context update
            prev_span_id = TracerConfig.current_span_id
            TracerConfig.current_span_id = span_id
            
            try:
                result = func(*args, **kwargs)
                TracerConfig.client.send_event(
                    event_type="tool_end",
                    trace_id=TracerConfig.current_trace_id,
                    parent_span_id=parent_span_id,
                    span_id=span_id,
                    name=name,
                    input_data=None,
                    output_data=result,
                    confidence=confidence,
                    status="success"
                )
                return result
            except Exception as e:
                TracerConfig.client.send_event(
                    event_type="tool_error",
                    trace_id=TracerConfig.current_trace_id,
                    parent_span_id=parent_span_id,
                    span_id=span_id,
                    name=name,
                    input_data=None,
                    output_data=str(e),
                    confidence=confidence,
                    status="error"
                )
                raise e
            finally:
                TracerConfig.current_span_id = prev_span_id
                
        return wrapper
    return decorator
