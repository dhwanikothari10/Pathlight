from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List

from app.core.database import get_db
from app.core.security import get_current_user, require_instructor
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, CourseAnalyticsOut

router = APIRouter()


@router.post("/", response_model=CourseOut, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    course = Course(**payload.model_dump(), instructor_id=instructor.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/", response_model=List[CourseOut])
def list_courses(
    category: Optional[str] = None,
    level: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Standard keyword/filter-based search. The AI NL search endpoint
    (app/routers/ai_search.py) builds on top of this same filtering logic.
    """
    query = db.query(Course).filter(Course.is_published == 1)

    if category:
        query = query.filter(Course.category.ilike(f"%{category}%"))
    if level:
        query = query.filter(Course.level == level)
    if min_price is not None:
        query = query.filter(Course.price >= min_price)
    if max_price is not None:
        query = query.filter(Course.price <= max_price)
    if keyword:
        query = query.filter(
            or_(Course.title.ilike(f"%{keyword}%"), Course.description.ilike(f"%{keyword}%"))
        )

    return query.all()


@router.get("/my-courses", response_model=List[CourseOut])
def my_courses(db: Session = Depends(get_db), instructor: User = Depends(require_instructor)):
    return db.query(Course).filter(Course.instructor_id == instructor.id).all()


@router.get("/my-courses/analytics", response_model=List[CourseAnalyticsOut])
def my_courses_analytics(db: Session = Depends(get_db), instructor: User = Depends(require_instructor)):
    """
    Per-course stats for the instructor dashboard: enrollments, revenue,
    completion rate, and rating -- everything an instructor would want to
    see at a glance across all their courses.
    """
    from app.models.enrollment import Enrollment

    courses = db.query(Course).filter(Course.instructor_id == instructor.id).all()

    results = []
    for course in courses:
        enrollments = db.query(Enrollment).filter(Enrollment.course_id == course.id).all()
        enrollment_count = len(enrollments)
        completed_count = sum(1 for e in enrollments if e.progress_percent >= 100)
        completion_rate = round((completed_count / enrollment_count) * 100, 1) if enrollment_count else 0.0

        results.append(
            CourseAnalyticsOut(
                course_id=course.id,
                title=course.title,
                is_published=bool(course.is_published),
                price=course.price,
                enrollment_count=enrollment_count,
                revenue=round(course.price * enrollment_count, 2),
                completion_rate=completion_rate,
                average_rating=course.average_rating,
                review_count=course.review_count,
            )
        )

    return results


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    instructor: User = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="Not your course")

    # Explicitly clean up the full dependency tree before deleting the course.
    # lecture_completions is referenced from BOTH lectures and enrollments,
    # so it must be cleared before either of those tables, regardless of
    # which side the ORM's relationship cascade is attached to.
    from app.models.lecture import Lecture
    from app.models.section import Section
    from app.models.enrollment import Enrollment, LectureCompletion
    from app.models.review import Review
    from app.models.quiz import QuizQuestion

    lecture_ids = [
        row.id
        for row in db.query(Lecture.id)
        .join(Section)
        .filter(Section.course_id == course_id)
        .all()
    ]

    if lecture_ids:
        db.query(LectureCompletion).filter(LectureCompletion.lecture_id.in_(lecture_ids)).delete(
            synchronize_session=False
        )
        db.query(QuizQuestion).filter(QuizQuestion.lecture_id.in_(lecture_ids)).delete(
            synchronize_session=False
        )

    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.course_id == course_id).delete(synchronize_session=False)

    db.delete(course)  # cascades to sections -> lectures via ORM relationship
    db.commit()