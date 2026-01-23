
import sqlite3
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", "agent_evolver.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Configuration Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS configurations (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # History/Memory Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        prompt TEXT,
        completion TEXT,
        success BOOLEAN,
        meta TEXT
    )
    ''')

    # Training Jobs Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS training_jobs (
        id TEXT PRIMARY KEY,
        status TEXT,
        config TEXT,
        metrics TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    conn.commit()
    conn.close()

# --- Config Operations ---

def save_config(key: str, config_dict: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT OR REPLACE INTO configurations (key, value, updated_at) VALUES (?, ?, ?)',
        (key, json.dumps(config_dict), datetime.now())
    )
    conn.commit()
    conn.close()

def load_config(key: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM configurations WHERE key = ?', (key,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return json.loads(row['value'])
    return None

# --- History Operations ---

def add_history_item(prompt: str, completion: str, success: bool, meta: Dict[str, Any] = {}):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO history (timestamp, prompt, completion, success, meta) VALUES (?, ?, ?, ?, ?)',
        (datetime.now().isoformat(), prompt, completion, success, json.dumps(meta))
    )
    conn.commit()
    conn.close()

def get_recent_history(limit: int = 10) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM history ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]
