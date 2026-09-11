from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, os, socket
import uvicorn
from dotenv import load_dotenv
import db

load_dotenv()  # .env의 키를 추출하는 함수
app = FastAPI()
db.init_db()
print(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Msg(BaseModel):
    text: str


class Title(BaseModel):
    title: str


HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "Qwen/Qwen3-4B-Instruct-2507"


def get_available_port(start_port=8000, end_port=8100):
    for port in range(start_port, end_port + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("사용 가능한 로컬 포트를 찾지 못했습니다.")


def ask_ai(history):
    token = os.getenv("HF_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="HF_TOKEN이 설정되지 않았습니다.")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "model": HF_MODEL,
        "messages": history,
        "max_tokens": 1000,
    }
    try:
        res = requests.post(HF_URL, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"]
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="AI 서버에 연결하지 못했습니다.") from exc
    except (KeyError, IndexError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="AI 서버의 응답을 읽지 못했습니다.") from exc


def build_history(session_id):
    rows = db.read_message(session_id)
    return [
        {"role": "user" if r["role"] == "user" else "assistant", "content": r["text"]}
        for r in rows
    ]


@app.post("/chat")
def chat(msg: Msg):
    reply = ask_ai([{"role": "user", "content": msg.text}])
    return {"reply": reply}


# Create  # Update # Delete
@app.post("/sessions")
def new_session():
    session_id = db.create_session()
    return {"id": session_id, "title": "새 대화"}


# Read
@app.get("/sessions")
def list_sessions():
    return {"sessions": db.read_sessions()}


@app.get("/sessions/{session_id}/messages")
def list_messages(session_id: int):
    return {"messages": db.read_message(session_id)}


@app.post("/sessions/{session_id}/messages")
def send_message(session_id: int, msg: Msg):
    first = db.count_message(session_id) == 0
    db.create_message(session_id, "user", msg.text)
    if first:
        db.update_session(session_id, msg.text[:20])
    reply = ask_ai(build_history(session_id))
    db.create_message(session_id, "bot", reply)
    return {"reply": reply}


@app.put("/sessions/{session_id}")
def rename_session(session_id: int, body: Title):
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="제목이 비어 있습니다.")
    if db.update_session(session_id, title) == 0:
        raise HTTPException(status_code=404, detail="해당 대화가 없습니다.")
    return {"id": session_id, "title": title}


@app.delete("/sessions/{session_id}")
def remove_session(session_id: int):
    if db.delete_session(session_id) == 0:
        raise HTTPException(status_code=404, detail="해당 대화가 없습니다.")
    return {"delete": session_id}


if __name__ == "__main__":
    port = get_available_port()
    print(f"Starting local server on http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)