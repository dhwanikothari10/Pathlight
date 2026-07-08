from pydantic import BaseModel
from typing import Optional, List


# --- AI Q&A (RAG) ---
class QARequest(BaseModel):
    course_id: int
    question: str


class QAResponse(BaseModel):
    answer: str
    source_lectures: List[str] = []  # titles of lectures used as context


# --- AI NL Course Search ---
class NLSearchRequest(BaseModel):
    query: str  # e.g. "I want to learn web scraping for beginners under $50"


class NLSearchResponse(BaseModel):
    interpreted_filters: dict
    results: List[dict]


# --- AI Quiz Generator ---
class QuizGenerateRequest(BaseModel):
    lecture_id: int
    num_questions: int = 5


class QuizQuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str]

    class Config:
        from_attributes = True
