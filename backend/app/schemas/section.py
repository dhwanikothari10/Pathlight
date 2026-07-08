from pydantic import BaseModel
from typing import Optional, List


class LectureCreate(BaseModel):
    title: str
    video_url: Optional[str] = None
    duration_seconds: int = 0
    order_index: int = 0
    transcript: Optional[str] = None


class LectureOut(BaseModel):
    id: int
    title: str
    video_url: Optional[str]
    duration_seconds: int
    order_index: int
    section_id: int
    transcript: Optional[str]
    transcript_status: str

    class Config:
        from_attributes = True


class SectionCreate(BaseModel):
    title: str
    order_index: int = 0


class SectionOut(BaseModel):
    id: int
    title: str
    order_index: int
    course_id: int
    lectures: List[LectureOut] = []

    class Config:
        from_attributes = True