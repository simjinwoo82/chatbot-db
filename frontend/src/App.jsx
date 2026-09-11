import { useState, useEffect } from "react";


//const API = "https://chatbot-db-back-c5t2.onrender.com";
const API = import.meta.env.VITE_API_URL ||"http://127.0.0.1:8000";

// 렌더(Render) 무료 인스턴스는 일정 시간 요청이 없으면 슬립 상태가 되고,
// 다음 요청 시 최대 약 50초 정도 재기동(cold start) 시간이 걸릴 수 있다.
const REQUEST_TIMEOUT = 60000; // 재기동 시간을 감안한 넉넉한 타임아웃
const MAX_RETRIES = 2; // 재기동 도중 끊긴 연결을 위한 재시도 횟수
const COLD_START_HINT_DELAY = 4000; // 이 시간 넘게 응답이 없으면 "깨우는 중" 안내 표시

// 슬립 해제(cold start) 지연/일시적 연결 끊김에 대비한 fetch 래퍼
async function fetchWithRetry(url, options = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  if (lastErr?.name === "AbortError") {
    throw new Error("서버 응답이 지연되고 있습니다. 서버가 절전 모드에서 깨어나는 중일 수 있으니 잠시 후 다시 시도해주세요.");
  }
  throw new Error("서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
}

export default function App() {
  const [sessions, setSession] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState("");

  // func
  // 세션데이터 로드
  const loadSessions = async () => {
    const res = await fetchWithRetry(`${API}/sessions`);
    if (!res.ok) throw new Error("세션을 불러오지 못했습니다.");
    const data = await res.json();
    setSession(data.sessions);
    return data.sessions;
  };

  //세션의 채팅기록 로드
  const loadMsg = async (id) => {
    if (!id) {
      setMsgs([]);
      return;
    }
    const res = await fetchWithRetry(`${API}/sessions/${id}/messages`);
    if (!res.ok) throw new Error("대화 내용을 불러오지 못했습니다.");
    const data = await res.json();
    console.log(res);
    setMsgs(data.messages);
  };
  //선택된 세션 아이디 저장
  const openSession = (id) => {
    setSessionId(id);
    loadMsg(id);
  };

  //새로운 세션 추가
  const newSession = async () => {
    const hintTimer = setTimeout(() => setWaking(true), COLD_START_HINT_DELAY);
    try {
      setError("");
      const res = await fetchWithRetry(`${API}/sessions`, { method: "POST" });
      if (!res.ok) throw new Error("새 대화를 만들지 못했습니다.");
      const data = await res.json();
      await loadSessions();
      setSessionId(data.id);
      setMsgs([]);
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(hintTimer);
      setWaking(false);
    }
  };

  // 리액트 컴포넌트 상태에 따라 함수실행을 제어
  useEffect(() => {
    const initialize = async () => {
      const hintTimer = setTimeout(() => setWaking(true), COLD_START_HINT_DELAY);
      try {
        const list = await loadSessions();
        if (list.length > 0) {
          setSessionId(list[0].id);
          await loadMsg(list[0].id);
        }
      } catch (err) {
        setError(`${err.message} 백엔드가 실행 중인지 확인해주세요.`);
      } finally {
        clearTimeout(hintTimer);
        setWaking(false);
      }
    };
    initialize();
  }, []);

  // 수정할 세션의 아이디, 타이틀로 선택
  const startRename = (s) => {
    setEditId(s.id);
    setEditTitle(s.title);
  };
  // 세션 타이틀 수정 
  const saveTitle = async (id) => {
    try {
      setError("");
      await fetchWithRetry(`${API}/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle })
      });
      setEditId(null);
      await loadSessions();
    } catch (err) {
      setError(err.message);
    }
  };
  // 세션삭제
  const removeSession = async (id) => {
    try {
      setError("");
      await fetchWithRetry(`${API}/sessions/${id}`, { method: "DELETE" });
      const list = await loadSessions();
      const next = list.length > 0 ? list[0].id : null;
      setSessionId(next);
      loadMsg(next);
    } catch (err) {
      setError(err.message);
    }
  };
  //사용자의 메시지를 서버로 전달후 응답결과 반환
  const send = async () => {
    if (!input.trim() || !sessionId) return;
    const text = input;
    setInput("");
    setLoading(true);
    const hintTimer = setTimeout(() => setWaking(true), COLD_START_HINT_DELAY);
    try {
      setError("");
      const res = await fetchWithRetry(`${API}/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "메시지를 보내지 못했습니다.");
      }
      await loadMsg(sessionId);
      await loadSessions();
    } catch (err) {
      setError(err.message);
      setInput(text);
    } finally {
      clearTimeout(hintTimer);
      setWaking(false);
      setLoading(false);
    }
  };

  //엔터키 입력시 메시지 전송
  const onKey = (e) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <strong>Chatflow</strong>
            <span>AI 어시스턴트</span>
          </div>
        </div>
        <button className="new" onClick={newSession}>+ 새 대화</button>
        <p className="side-label">최근 대화</p>
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id} className={s.id === sessionId ? "session on" : "session"}>
              {console.log(editId)}
              {editId === s.id ? (
                <span className="rename">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  <button onClick={() => saveTitle(s.id)}>저장</button>
                </span>
              ) : (
                <>
                  <button className="session-title" onClick={() => openSession(s.id)}>{s.title}</button>
                  <span className="session-tools">
                    <button onClick={() => startRename(s)}>수정</button>
                    <button onClick={() => removeSession(s.id)}>삭제</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">PERSONAL ASSISTANT</p>
            <h1>무엇을 도와드릴까요?</h1>
          </div>
          <span className="online"><i /> 연결 준비됨</span>
        </header>
        <div className="box">
          {msgs.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h2>새로운 대화를 시작해보세요</h2>
              <p>궁금한 점을 입력하면 AI가 답변해드릴게요.</p>
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <span className="message-role">{m.role === "user" ? "나" : "AI"}</span>
              <p>{m.text}</p>
            </div>
          ))}
          {loading && !waking && <p className="loading">생각 중...</p>}
          {waking && <p className="loading">서버를 깨우는 중입니다... (최대 1분 정도 걸릴 수 있어요)</p>}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="input-row">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="메시지를 입력하세요..." disabled={!sessionId || loading} />
          <button onClick={send} disabled={!sessionId || loading || !input.trim()} aria-label="메시지 전송">↑</button>
        </div>
        {!sessionId && <p className="helper">왼쪽에서 새 대화를 만들어 시작하세요.</p>}
      </main>
    </div>
  );
}