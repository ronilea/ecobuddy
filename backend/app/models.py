import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    questions: Mapped[list["Question"]] = relationship(
        back_populates="session", order_by="Question.sequence_number"
    )


class Question(Base):
    """One MCQ: stem + four options live on this row (options is a JSON string list)."""

    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("quiz_sessions.id"), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)  # exactly 4 choice strings
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_why: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    focus_concept: Mapped[str] = mapped_column(String(255), nullable=False)
    buddy_intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    generation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    session: Mapped["QuizSession"] = relationship(back_populates="questions")
    answer: Mapped["StudentAnswer | None"] = relationship(back_populates="question", uselist=False)


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("questions.id"), unique=True, nullable=False)
    selected_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    question: Mapped["Question"] = relationship(back_populates="answer")


class Wallet(Base):
    """Anonymous player wallet keyed by client-generated player id (no auth)."""

    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    owned_outfits: Mapped[list] = mapped_column(JSON, nullable=False)
    equipped_outfit_id: Mapped[str] = mapped_column(String(64), nullable=False, default="default")
