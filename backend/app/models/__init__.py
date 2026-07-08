"""
Import all models here so that Base.metadata.create_all() in main.py
discovers every table. Also enables `from app.models import User, Course, ...`
"""

from app.models.user import User, UserRole
from app.models.course import Course
from app.models.section import Section
from app.models.lecture import Lecture
from app.models.enrollment import Enrollment, LectureCompletion
from app.models.review import Review
from app.models.quiz import QuizQuestion

__all__ = [
    "User",
    "UserRole",
    "Course",
    "Section",
    "Lecture",
    "Enrollment",
    "LectureCompletion",
    "Review",
    "QuizQuestion",
]
