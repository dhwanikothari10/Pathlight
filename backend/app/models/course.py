from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    subtitle = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, index=True, nullable=True)  # e.g. "Web Development"
    level = Column(String, index=True, nullable=True)     # "beginner" | "intermediate" | "advanced"
    price = Column(Float, default=0.0, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    is_published = Column(Integer, default=0)  # 0 = draft, 1 = published

    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instructor = relationship("User", back_populates="courses_created", foreign_keys=[instructor_id])
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan", order_by="Section.order_index")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="course", cascade="all, delete-orphan")

    @property
    def review_count(self):
        return len(self.reviews)

    @property
    def average_rating(self):
        if not self.reviews:
            return None
        return round(sum(r.rating for r in self.reviews) / len(self.reviews), 1)