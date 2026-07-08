"""
AI-Powered Learning Platform — FastAPI entry point.

Run locally with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base

# Routers
from app.routers import auth, courses, sections, lectures, enrollments, reviews
from app.routers import payments
from app.routers import ai_qa, ai_search, ai_quiz

# Create tables (for dev; in production prefer Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Learning Platform API",
    description="Udemy-style course marketplace with AI-powered Q&A, search, and quiz generation.",
    version="0.1.0",
)

# CORS — allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core CRUD routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(sections.router, prefix="/api/sections", tags=["Sections"])
app.include_router(lectures.router, prefix="/api/lectures", tags=["Lectures"])
app.include_router(enrollments.router, prefix="/api/enrollments", tags=["Enrollments"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

# AI feature routers
app.include_router(ai_qa.router, prefix="/api/ai/qa", tags=["AI - Q&A"])
app.include_router(ai_search.router, prefix="/api/ai/search", tags=["AI - NL Search"])
app.include_router(ai_quiz.router, prefix="/api/ai/quiz", tags=["AI - Quiz Generator"])


@app.get("/")
def root():
    return {"status": "ok", "service": "ai-learning-platform-api"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
