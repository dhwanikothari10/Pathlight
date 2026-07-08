from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.course import Course
from app.models.user import User
from app.schemas.ai import QARequest, QAResponse
from app.ai.rag.qa_service import answer_question

router = APIRouter()


@router.post("/ask", response_model=QAResponse)
def ask_course_question(
    payload: QARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = answer_question(payload.course_id, payload.question)
    return QAResponse(**result)
