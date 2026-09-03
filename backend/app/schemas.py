from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class GeneratedQuestion(BaseModel):
    stem: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str
    explanation_why: str
    difficulty: Literal["easy", "medium", "hard"]
    focus_concept: str
    buddy_intro: str
    buddy_hint: str


class SessionInsights(BaseModel):
    strengths: list[str]
    gaps: list[str]
    recommended_next_steps: list[str]
    buddy_summary: str


class CreateSessionRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=255)


class AnswerOptionOut(BaseModel):
    option_index: int
    text: str


class StudentAnswerOut(BaseModel):
    selected_option_index: int
    is_correct: bool
    answered_at: datetime


class QuestionOut(BaseModel):
    id: UUID
    sequence_number: int
    stem: str
    focus_concept: str
    options: list[AnswerOptionOut]
    buddy_intro: str | None
    buddy_hint: str | None = None
    answer: StudentAnswerOut | None = None
    explanation: str | None = None
    explanation_why: str | None = None
    correct_option_index: int | None = None


class SubmitAnswerRequest(BaseModel):
    question_id: UUID
    selected_option_index: int = Field(ge=0, le=3)


class CoinEventOut(BaseModel):
    streak_bonus: bool = False
    set_complete_bonus: bool = False
    coins_earned: int = 0


class AnswerFeedbackOut(BaseModel):
    is_correct: bool
    correct_option_index: int
    explanation: str
    explanation_why: str | None = None
    coins: CoinEventOut
    quiz_complete: bool = False


class SessionSummaryOut(BaseModel):
    strengths: list[str]
    gaps: list[str]
    recommended_next_steps: list[str]
    buddy_summary: str


class SessionOut(BaseModel):
    id: UUID
    topic: str
    status: Literal["active", "completed"]
    started_at: datetime
    completed_at: datetime | None
    questions: list[QuestionOut]
    current_question_id: UUID | None
    answered_count: int
    total_questions: int
    summary: SessionSummaryOut | None = None


class WalletOut(BaseModel):
    player_id: UUID
    coins: int
    owned_outfits: list[str]
    equipped_outfit_id: str


class PurchaseOutfitRequest(BaseModel):
    outfit_id: str = Field(min_length=1, max_length=64)


class EquipOutfitRequest(BaseModel):
    outfit_id: str = Field(min_length=1, max_length=64)
