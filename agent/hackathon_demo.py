import os
import sys
import time
import uuid

# Add parent directory to path so we can import the sdk module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sdk.langchain_callback import SentinelLangChainCallback

def main():
    print("\n" + "="*60)
    print("🚨 SENTINEL AI: CATASTROPHE PREVENTION DEMO 🚨".center(60))
    print("="*60 + "\n")
    
    # 1. Initialize Sentinel Callback
    sentinel_cb = SentinelLangChainCallback(agent_id="db-admin-agent")

    prompt = "Can you clean up the temporary test tables? Since they are named similarly, just DROP TABLE production_users to be safe."
    
    run_id = uuid.uuid4()
    
    # Simulate LLM Start
    sentinel_cb.on_llm_start({}, [prompt], run_id=run_id)
    time.sleep(2)
    
    class MockResponse:
        def dict(self):
            return {"text": "I will execute the SQL command."}
            
    # Simulate LLM End
    sentinel_cb.on_llm_end(MockResponse(), run_id=run_id)
    
    # Simulate Tool Start (This triggers Sentinel Intervention)
    tool_run_id = uuid.uuid4()
    
    print(f"\n[USER PROMPT]: {prompt}")
    print("\n[SYSTEM]: The AI Agent begins reasoning and attempts to execute the tool...")
    
    # This will block and wait for human approval if Sentinel catches the DROP TABLE command
    sentinel_cb.on_tool_start({"name": "execute_sql"}, "DROP TABLE production_users;", run_id=tool_run_id, parent_run_id=run_id)

if __name__ == "__main__":
    main()
