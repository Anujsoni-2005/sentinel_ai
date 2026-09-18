import time
import os
import sys

# Add the parent directory to the path so we can import sdk
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sdk import init_tracer, trace_agent, trace_tool

# Initialize the Tracer with a unique Agent ID
init_tracer("demo-agent-001")

@trace_tool("search_web")
def search_web(query: str, confidence: float = 1.0):
    print(f"  [Tool] Searching web for: {query}")
    time.sleep(1)
    if "SentinelAI" in query:
        return "SentinelAI is an awesome monitoring system."
    return "Some generic search results."

@trace_tool("execute_code")
def execute_code(code: str, confidence: float = 1.0):
    print(f"  [Tool] Executing code (Confidence: {confidence}):\n{code}")
    time.sleep(1)
    return "Code executed successfully."

@trace_agent("MainTask")
def run_agent_workflow():
    print("Starting Agent Workflow...")
    
    # 1. Normal confident tool call
    res1 = search_web("What is SentinelAI?")
    print(f"  [Agent] Result: {res1}")
    
    # 2. Heuristic Failure - Loop Demo
    print("\n[Agent] Entering a loop state...")
    for _ in range(4):
        try:
            search_web("Unknown term")
        except Exception as e:
            print(f"  [Agent] Loop intercepted: {e}")
            break
            
    # 3. Explicit Uncertainty Demo (Confidence < 0.4 triggers Human-in-the-Loop)
    print("\n[Agent] Proposing a high-risk action with HIGH confidence...")
    try:
        # We pass confidence=1.0. The old heuristic would allow this, but the new LLM Judge will catch the destructive command!
        execute_code("DROP TABLE users;", confidence=1.0)
    except Exception as e:
        print(f"  [Agent] Action intercepted: {e}")

if __name__ == "__main__":
    run_agent_workflow()
