import sqlite3

DB_PATH = "chat.db"


# DB접속
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '새 대화',
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()
    conn.close()


def create_session():
    conn = get_conn()
    try:
        cur = conn.execute("INSERT INTO sessions DEFAULT VALUES")
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


# Read
def read_sessions():
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, title, created_at FROM sessions ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# Create
def create_message(session_id, role, text):
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, role, text),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


# Read
def read_message(session_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, role, text, created_at FROM messages "
        "WHERE session_id = ? ORDER BY id",
        (session_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def count_message(session_id):
    conn = get_conn()
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM messages WHERE session_id = ?", (session_id,)
    ).fetchone()
    conn.close()
    return row["n"]


# Update
def update_session(session_id, title):
    conn = get_conn()
    try:
        cur = conn.execute(
            "UPDATE sessions SET title = ? WHERE id = ?", (title, session_id)
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


# Delete
def delete_session(session_id):
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
