from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_student
from app.models.enrollment import Enrollment, LectureCompletion
from app.models.lecture import Lecture
from app.models.section import Section
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentOut, LectureCompletionCreate

router = APIRouter()


@router.post("/", response_model=EnrollmentOut, status_code=201)
def enroll_in_course(
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Direct enrollment endpoint. In production this is called AFTER a
    successful Stripe payment confirmation (see routers/payments.py webhook).
    Restricted to student-role accounts -- instructors browse and manage
    courses, but enrolling as a learner is a student action.
    """
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == current_user.id, Enrollment.course_id == payload.course_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    enrollment = Enrollment(student_id=current_user.id, course_id=payload.course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/my-enrollments", response_model=List[EnrollmentOut])
def my_enrollments(db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    return db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()


@router.post("/{enrollment_id}/complete-lecture", response_model=EnrollmentOut)
def toggle_lecture_complete(
    enrollment_id: int,
    payload: LectureCompletionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Toggles a lecture's completion status for this enrollment -- marks it
    complete if it isn't already, or un-marks it if it is. Same endpoint
    either way; the frontend doesn't need to know which direction it's
    toggling, it just re-renders based on the returned enrollment state.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if enrollment.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your enrollment")

    existing = (
        db.query(LectureCompletion)
        .filter(LectureCompletion.enrollment_id == enrollment_id, LectureCompletion.lecture_id == payload.lecture_id)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(LectureCompletion(enrollment_id=enrollment_id, lecture_id=payload.lecture_id))
    db.commit()

    # Recalculate progress: completed lectures / total lectures in the course
    total_lectures = (
        db.query(Lecture)
        .join(Section)
        .filter(Section.course_id == enrollment.course_id)
        .count()
    )
    completed_count = db.query(LectureCompletion).filter(LectureCompletion.enrollment_id == enrollment_id).count()

    enrollment.progress_percent = round((completed_count / total_lectures) * 100, 2) if total_lectures else 0.0
    db.commit()
    db.refresh(enrollment)
    return enrollment