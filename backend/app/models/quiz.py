from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class QuizQuestion(Base):
    """A single AI-generated multiple-choice question tied to a lecture."""
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)

    question_text = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False)  # "A" | "B" | "C" | "D"
    explanation = Column(Text, nullable=True)

    lecture = relationship("Lecture", back_populates="quiz_questions")
