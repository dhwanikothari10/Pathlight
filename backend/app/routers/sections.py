from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_instructor
from app.models.section import Section
from app.models.course import Course
from app.models.lecture import Lecture
from app.models.enrollment import LectureCompletion
from app.models.quiz import QuizQuestion
from app.models.user import User
from app.schemas.section import SectionCreate, SectionOut

router = APIRouter()


@router.post("/course/{course_id}", response_model=SectionOut, status_code=201)
def add_section(
    course_id: int,
    payload: SectionCreate,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    section = Section(**payload.model_dump(), course_id=course_id)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.get("/course/{course_id}", response_model=list[SectionOut])
def list_sections(course_id: int, db: Session = Depends(get_db)):
    return db.query(Section).filter(Section.course_id == course_id).order_by(Section.order_index).all()


@router.delete("/{section_id}", status_code=204)
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    # Same fix as delete_lecture/delete_course: clean up dependent rows for
    # every lecture in this section before deleting, to avoid FK violations
    # if any lecture has completions or quiz questions attached.
    lecture_ids = [row.id for row in db.query(Lecture.id).filter(Lecture.section_id == section_id).all()]

    if lecture_ids:
        db.query(LectureCompletion).filter(LectureCompletion.lecture_id.in_(lecture_ids)).delete(
            synchronize_session=False
        )
        db.query(QuizQuestion).filter(QuizQuestion.lecture_id.in_(lecture_ids)).delete(
            synchronize_session=False
        )

    db.delete(section)  # cascades to lectures via ORM relationship
    db.commit()