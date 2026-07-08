from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Enrollment(Base):
    """Tracks a student's purchase of, and progress through, a course."""
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "course_id", name="unique_enrollment"),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    progress_percent = Column(Float, default=0.0)
    stripe_payment_id = Column(Integer, nullable=True)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    completed_lectures = relationship("LectureCompletion", back_populates="enrollment", cascade="all, delete-orphan")

    @property
    def completed_lecture_ids(self):
        """Flat list of lecture IDs this enrollment has marked complete, so
        the frontend can restore checkmarks/button state without a second
        request."""
        return [c.lecture_id for c in self.completed_lectures]


class LectureCompletion(Base):
    """Tracks which lectures a student has marked complete within an enrollment."""
    __tablename__ = "lecture_completions"
    __table_args__ = (UniqueConstraint("enrollment_id", "lecture_id", name="unique_completion"),)

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollment = relationship("Enrollment", back_populates="completed_lectures")