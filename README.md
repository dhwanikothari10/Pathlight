# Pathlight — AI-Powered Learning Platform

A full-stack online course marketplace (Udemy-style) with three AI features built in
from day one: a RAG-based course Q&A tutor, natural-language course search, and an
AI quiz generator.

Built as a portfolio project to demonstrate full-stack engineering (FastAPI + React +
PostgreSQL) alongside applied AI/ML (RAG, LLM-powered search, content generation).

## Features

**Core marketplace**
- JWT auth with student/instructor roles
- Instructors: create courses, organize content into sections → lectures, upload
  lecture videos (either paste a URL or upload a file to Cloudinary), publish/unpublish
- Students: browse/search courses, purchase via Stripe Checkout (or enroll free),
  watch lectures, track per-lecture progress, leave reviews

**AI features**
1. **Course AI Tutor (RAG)** — students ask questions about a course and get answers
   grounded in that course's actual lecture transcripts, using a per-course ChromaDB
   vector store and Claude for generation.
2. **Natural language course search** — "I want to learn web scraping for beginners
   under $50" gets parsed into structured filters (category/level/price/keyword) and
   run against the course catalog.
3. **AI quiz generator** — instructors generate multiple-choice quiz questions
   automatically from a lecture's transcript.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React (Vite), Tailwind CSS, React Router |
| Auth | JWT (python-jose, passlib/bcrypt) |
| Payments | Stripe Checkout (test mode) |
| Video storage | Cloudinary |
| Vector store | ChromaDB (embedded, persists to disk) |
| LLM | Anthropic Claude API |
| Deployment | Render / Railway (backend + Postgres), Render/Vercel for frontend |

## Project structure

```
ai-learn-platform/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app + router registration
│       ├── core/                # config, db session, JWT/auth utils
│       ├── models/               # SQLAlchemy models
│       ├── schemas/             # Pydantic request/response schemas
│       ├── routers/             # API endpoints (auth, courses, sections, lectures,
│       │                          enrollments, reviews, payments, ai_qa, ai_search, ai_quiz)
│       ├── services/            # Cloudinary upload service
│       └── ai/
│           ├── llm_client.py    # Anthropic API wrapper
│           ├── rag/             # chunking, ingestion, Q&A generation
│           ├── nl_search/       # NL query → structured filter parsing
│           └── quiz_gen/        # transcript → quiz question generation
└── frontend/
    └── src/
        ├── pages/               # route-level components
        ├── components/          # Navbar, CourseCard, AIQAPanel, ProtectedRoute
        ├── context/              # AuthContext
        └── services/             # axios client + per-resource API calls
```

## Local setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # fill in your real keys
# Requires a running PostgreSQL instance matching DATABASE_URL

uvicorn app.main:app --reload     # http://localhost:8000
```

API docs available at `http://localhost:8000/docs` (Swagger UI).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env              # defaults to http://localhost:8000/api
npm run dev                       # http://localhost:5173
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. You'll need:
- A PostgreSQL database (local or hosted, e.g. Render/Railway/Supabase)
- A free [Cloudinary](https://cloudinary.com) account for video hosting
- [Stripe](https://dashboard.stripe.com/test/apikeys) test-mode API keys
- An [Anthropic API key](https://console.anthropic.com) for the AI features

## Deployment notes

- **Backend**: deploy to Render or Railway as a Python web service. Add a managed
  PostgreSQL add-on and set `DATABASE_URL` accordingly. Mount a persistent disk
  for `CHROMA_PERSIST_DIR` so the vector store survives restarts.
- **Frontend**: deploy to Render Static Site, Vercel, or Netlify. Set `VITE_API_URL`
  to your deployed backend URL.
- **Stripe webhook**: after deploying, register your `/api/payments/webhook` URL
  in the Stripe dashboard and update `STRIPE_WEBHOOK_SECRET`.

## Why this project

This was built to demonstrate the full range expected of a Python developer role:
REST API design, relational schema design, authentication, third-party payment
integration, file/video upload handling, and — distinctively — applied AI features
(RAG, LLM-based parsing, and content generation) integrated as first-class product
features rather than a bolted-on demo.
