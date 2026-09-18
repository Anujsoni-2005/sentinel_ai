import sqlite3
import json
from contextlib import contextmanager

DB_PATH = "sentinel.db"

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS traces (
                trace_id TEXT,
                parent_span_id TEXT,
                span_id TEXT PRIMARY KEY,
                agent_id TEXT,
                event_type TEXT,
                name TEXT,
                input_data TEXT,
                output_data TEXT,
                confidence REAL,
                status TEXT,
                metadata TEXT,
                timestamp REAL
            )
        ''')
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def save_event(event: dict):
    with get_db() as conn:
        # Upsert logic to handle updates (e.g. from running -> paused -> success)
        conn.execute('''
            INSERT INTO traces (
                trace_id, parent_span_id, span_id, agent_id, event_type, 
                name, input_data, output_data, confidence, status, metadata, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(span_id) DO UPDATE SET
                status = excluded.status,
                output_data = excluded.output_data,
                metadata = excluded.metadata
        ''', (
            event['trace_id'], event.get('parent_span_id'), event['span_id'], 
            event['agent_id'], event['event_type'], event['name'], 
            event.get('input_data'), event.get('output_data'), 
            event.get('confidence', 1.0), event['status'], 
            json.dumps(event.get('metadata', {})), event['timestamp']
        ))
        conn.commit()

def get_status(span_id: str):
    with get_db() as conn:
        cur = conn.execute('SELECT status FROM traces WHERE span_id = ?', (span_id,))
        row = cur.fetchone()
        return row['status'] if row else None

def update_status(span_id: str, new_status: str):
    with get_db() as conn:
        conn.execute('UPDATE traces SET status = ? WHERE span_id = ?', (new_status, span_id))
        conn.commit()
