from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    course_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    comment: Optional[str]
    student_id: int
    course_id: int
    created_at: datetime

    class Config:
        from_attributes = True
