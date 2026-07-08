from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.review import Review
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter()


@router.post("/", response_model=ReviewOut, status_code=201)
def add_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only enrolled students can review — mirrors real platform behavior
    enrolled = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == current_user.id, Enrollment.course_id == payload.course_id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="You must be enrolled to review this course")

    existing = (
        db.query(Review)
        .filter(Review.student_id == current_user.id, Review.course_id == payload.course_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this course")

    review = Review(**payload.model_dump(), student_id=current_user.id)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/course/{course_id}", response_model=List[ReviewOut])
def list_reviews(course_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.course_id == course_id).all()
