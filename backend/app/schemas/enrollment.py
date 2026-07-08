from pydantic import BaseModel
from datetime import datetime
from typing import List


class EnrollmentCreate(BaseModel):
    course_id: int


class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    progress_percent: float
    completed_lecture_ids: List[int] = []
    enrolled_at: datetime

    class Config:
        from_attributes = True


class LectureCompletionCreate(BaseModel):
    lecture_id: int