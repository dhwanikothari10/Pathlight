from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    video_url = Column(String, nullable=True)       # Cloudinary URL or pasted YouTube/Vimeo link
    duration_seconds = Column(Integer, default=0)
    order_index = Column(Integer, default=0)

    # Transcript/notes text — this becomes the knowledge base chunked for the RAG Q&A agent
    transcript = Column(Text, nullable=True)
    # "manual" | "pending" | "completed" | "failed" — tracks background auto-transcription
    transcript_status = Column(String, default="manual", nullable=False)

    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    section = relationship("Section", back_populates="lectures")
    quiz_questions = relationship("QuizQuestion", back_populates="lecture", cascade="all, delete-orphan")
