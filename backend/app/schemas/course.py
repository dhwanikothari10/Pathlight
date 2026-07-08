from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CourseCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    price: float = 0.0
    thumbnail_url: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    price: Optional[float] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[int] = None


class CourseOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str]
    description: Optional[str]
    category: Optional[str]
    level: Optional[str]
    price: float
    thumbnail_url: Optional[str]
    is_published: int
    instructor_id: int
    created_at: datetime
    average_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True


class CourseListFilters(BaseModel):
    """Used by both keyword search and the AI NL-to-filter search."""
    category: Optional[str] = None
    level: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    keyword: Optional[str] = None


class CourseAnalyticsOut(BaseModel):
    """Per-course stats for the instructor analytics dashboard."""
    course_id: int
    title: str
    is_published: bool
    price: float
    enrollment_count: int
    # Revenue is an approximation: price × enrollment count. It doesn't
    # account for a course's price changing after some students already
    # enrolled at an older price, since we don't store the amount actually
    # paid per-enrollment (only the current course price). Fine for a
    # portfolio-scale project; a production version would record the paid
    # amount on the Enrollment/payment record itself.
    revenue: float
    completion_rate: float  # 0-100, % of enrollments at 100% progress
    average_rating: Optional[float] = None
    review_count: int = 0