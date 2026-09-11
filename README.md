# 🤖 AI Chatbot

FastAPI 백엔드와 React(Vite) 프론트엔드로 구성된 AI 챗봇 애플리케이션입니다.  
Hugging Face Inference API를 활용하여 사용자의 질문에 한국어로 친절하게 답변합니다.

---

## 🌐 배포 사이트 (Live Demo)

| 구분 | URL |
| --- | --- |
| Frontend | [https://two026-chatbot-frontend-465s.onrender.com](https://two026-chatbot-frontend-465s.onrender.com) |
| Backend API | [https://chatbot-pxte.onrender.com](https://chatbot-pxte.onrender.com) |

> ⚠️ Render 무료 플랜(Free)을 사용 중이라, 백엔드가 일정 시간 미사용 시 슬립 상태로 전환됩니다.  
> 슬립 상태에서 첫 요청을 보내면 서버가 다시 깨어나기까지 최대 1분 정도 응답이 지연될 수 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### Backend
- **Python 3.14+**
- **FastAPI**
- **Uvicorn**
- **Hugging Face Inference API** (Qwen/Qwen3-4B-Instruct)

### Frontend
- **React 19**
- **Vite**
- **CSS3**

---

## 📁 프로젝트 구조 (Directory Structure)

```
chatbot/
├── backend/
│   ├── .env.example
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 시작하기 (Getting Started)

### 1. Backend 실행 방법

```bash
cd backend

# 가상환경 생성 및 활성화 (Windows)
python -m venv .venv
.venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# .env 파일 생성 및 Hugging Face 토큰 설정
# .env.example 파일을 참고하여 .env 파일을 생성하세요.
# HF_TOKEN=your_huggingface_token_here

# 서버 실행
uvicorn main:app --reload --port 8000
```

### 2. Frontend 실행 방법

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하여 챗봇을 사용할 수 있습니다.

> 로컬에서 프론트엔드를 실행하면 `frontend/src/App.jsx`에 설정된 배포된 백엔드 주소(`https://chatbot-pxte.onrender.com`)로 요청이 전송됩니다.  
> 로컬 백엔드(`http://localhost:8000`)를 사용하려면 `App.jsx`의 `API` 상수 주석을 바꿔주세요.

---

## 🚀 배포 방법 (Deployment on Render)

이 프로젝트는 [Render](https://render.com)에 프론트엔드/백엔드를 각각 별도 서비스로 배포합니다. (하나의 GitHub 저장소, 서로 다른 Root Directory)

### 1. Backend — Web Service

| 설정 | 값 |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port 10000` |
| Region | Singapore |
| Environment Variables | `HF_TOKEN` = Hugging Face 토큰 |

### 2. Frontend — Static Site

| 설정 | 값 |
| --- | --- |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

두 서비스 모두 GitHub `main` 브랜치에 push하면 Render가 자동으로 재배포합니다 (Auto-Deploy: On Commit).

> 프론트엔드를 배포할 때는 `frontend/src/App.jsx`의 `API` 상수가 실제 배포된 백엔드 URL을 가리키는지 확인하세요.
