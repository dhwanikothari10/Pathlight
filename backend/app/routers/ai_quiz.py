from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import require_instructor
from app.models.lecture import Lecture
from app.models.quiz import QuizQuestion
from app.models.user import User
from app.schemas.ai import QuizGenerateRequest, QuizQuestionOut
from app.ai.quiz_gen.quiz_service import generate_quiz_questions

router = APIRouter()


@router.post("/generate", response_model=List[QuizQuestionOut], status_code=201)
def generate_quiz(
    payload: QuizGenerateRequest,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    lecture = db.query(Lecture).filter(Lecture.id == payload.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    if lecture.section.course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")
    if not lecture.transcript:
        raise HTTPException(status_code=400, detail="Lecture has no transcript to generate quiz from")

    generated = generate_quiz_questions(lecture.transcript, payload.num_questions)
    if not generated:
        raise HTTPException(status_code=502, detail="Quiz generation failed — try again")

    saved_questions = []
    for q in generated:
        quiz_q = QuizQuestion(lecture_id=lecture.id, **q)
        db.add(quiz_q)
        saved_questions.append(quiz_q)

    db.commit()
    for q in saved_questions:
        db.refresh(q)

    return saved_questions


@router.get("/lecture/{lecture_id}", response_model=List[QuizQuestionOut])
def get_quiz_for_lecture(lecture_id: int, db: Session = Depends(get_db)):
    return db.query(QuizQuestion).filter(QuizQuestion.lecture_id == lecture_id).all()
