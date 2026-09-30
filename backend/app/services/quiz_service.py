import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.quiz_policy import (
    COIN_SET_COMPLETE,
    COIN_STREAK_BONUS,
    QUESTIONS_PER_SET,
    STREAK_LENGTH,
    TOTAL_QUESTIONS,
)
from app.models import Question, QuizSession, StudentAnswer
from app.schemas import (
    AnswerFeedbackOut,
    CoinEventOut,
    GeneratedQuestion,
    QuestionOut,
    SessionOut,
    SessionSummaryOut,
    StudentAnswerOut,
)
from app.database import SessionLocal
from app.services import llm_service, wallet_service

logger = logging.getLogger(__name__)


def _answered_questions(session: QuizSession) -> list[Question]:
    return [q for q in session.questions if q.answer is not None]


def _answered_count(session: QuizSession) -> int:
    return len(_answered_questions(session))


def _history_from_session(session: QuizSession) -> list[dict]:
    return [
        {
            "sequence_number": q.sequence_number,
            "stem": q.stem,
            "focus_concept": q.focus_concept,
            "is_correct": q.answer.is_correct,
        }
        for q in _answered_questions(session)
    ]


def _question_out(q: Question) -> QuestionOut:
    answer_out = None
    explanation = None
    explanation_why = None
    correct_index = None

    if q.answer is not None:
        answer_out = StudentAnswerOut(
            selected_option_index=q.answer.selected_option_index,
            is_correct=q.answer.is_correct,
            answered_at=q.answer.answered_at,
        )
        explanation = q.explanation
        explanation_why = q.explanation_why
        correct_index = q.correct_option_index

    if q.generation_metadata is None:
        logger.error("Question %s missing generation_metadata", q.id)
        buddy_hint = None
    else:
        buddy_hint = q.generation_metadata.get("buddy_hint")

    return QuestionOut(
        id=q.id,
        sequence_number=q.sequence_number,
        stem=q.stem,
        focus_concept=q.focus_concept,
        options=[
            {"option_index": i, "text": text} for i, text in enumerate(q.options)
        ],
        buddy_intro=q.buddy_intro,
        buddy_hint=buddy_hint,
        answer=answer_out,
        explanation=explanation,
        explanation_why=explanation_why,
        correct_option_index=correct_index,
    )


def _session_status(session: QuizSession) -> str:
    if session.completed_at is not None and _answered_count(session) >= TOTAL_QUESTIONS:
        return "completed"
    return "active"


def _current_question_id(session: QuizSession) -> UUID | None:
    for q in session.questions:
        if q.answer is None:
            return q.id
    return None


def build_session_out(session: QuizSession) -> SessionOut:
    summary = None
    if session.summary_json:
        summary = SessionSummaryOut.model_validate(session.summary_json)

    return SessionOut(
        id=session.id,
        topic=session.topic,
        status=_session_status(session),
        started_at=session.started_at,
        completed_at=session.completed_at,
        questions=[_question_out(q) for q in session.questions],
        current_question_id=_current_question_id(session),
        answered_count=_answered_count(session),
        total_questions=TOTAL_QUESTIONS,
        summary=summary,
    )


def get_session(db: Session, session_id: UUID) -> QuizSession:
    session = (
        db.query(QuizSession)
        .options(joinedload(QuizSession.questions).joinedload(Question.answer))
        .filter(QuizSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _persist_question(
    db: Session,
    session: QuizSession,
    generated: GeneratedQuestion,
    metadata: dict,
    sequence_number: int,
) -> None:
    question = Question(
        session_id=session.id,
        sequence_number=sequence_number,
        stem=generated.stem,
        options=list(generated.options),
        explanation=generated.explanation,
        explanation_why=generated.explanation_why,
        correct_option_index=generated.correct_index,
        difficulty=generated.difficulty,
        focus_concept=generated.focus_concept,
        buddy_intro=generated.buddy_intro,
        generation_metadata={**metadata, "buddy_hint": generated.buddy_hint},
    )
    db.add(question)
    db.flush()


def _run_in_transaction(db: Session, work) -> None:
    try:
        work()
        db.commit()
    except Exception:
        logger.exception("Quiz transaction failed; rolling back")
        db.rollback()
        raise


def create_session(topic: str) -> SessionOut:
    topic = topic.strip()
    generated, metadata = llm_service.generate_question(topic, [], 1)

    db = SessionLocal()
    try:
        session = QuizSession(topic=topic)
        db.add(session)

        def work() -> None:
            db.flush()
            _persist_question(db, session, generated, metadata, 1)

        _run_in_transaction(db, work)
        return build_session_out(get_session(db, session.id))
    finally:
        db.close()


def _compute_coins_after_answer(
    prior_answered: list[Question], is_correct: bool
) -> CoinEventOut:
    if not is_correct:
        return CoinEventOut()

    answered_count = len(prior_answered) + 1
    coins = 0
    streak_bonus = False
    set_complete_bonus = False

    if answered_count >= STREAK_LENGTH:
        recent = prior_answered[-(STREAK_LENGTH - 1) :]
        if all(q.answer is not None and q.answer.is_correct for q in recent):
            streak_bonus = True
            coins += COIN_STREAK_BONUS

    if answered_count % QUESTIONS_PER_SET == 0:
        set_complete_bonus = True
        coins += COIN_SET_COMPLETE

    return CoinEventOut(
        streak_bonus=streak_bonus,
        set_complete_bonus=set_complete_bonus,
        coins_earned=coins,
    )


def _history_after_answer(session: QuizSession, question: Question, is_correct: bool) -> list[dict]:
    history = _history_from_session(session)
    history.append(
        {
            "sequence_number": question.sequence_number,
            "stem": question.stem,
            "focus_concept": question.focus_concept,
            "is_correct": is_correct,
        }
    )
    return history


def _require_current_unanswered(session: QuizSession, question_id: UUID) -> Question:
    if session.completed_at is not None:
        raise HTTPException(status_code=400, detail="Quiz already completed")

    question = next((q for q in session.questions if q.id == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.answer is not None:
        raise HTTPException(status_code=400, detail="Question already answered")
    if question.id != _current_question_id(session):
        raise HTTPException(status_code=400, detail="Answer questions in order")
    return question


def submit_answer(
    session_id: UUID,
    question_id: UUID,
    selected_option_index: int,
    player_id: UUID,
) -> tuple[AnswerFeedbackOut, SessionOut]:
    db = SessionLocal()
    try:
        session = get_session(db, session_id)
        question = _require_current_unanswered(session, question_id)
        is_correct = selected_option_index == question.correct_option_index
        prior_answered = _answered_questions(session)
        coins = _compute_coins_after_answer(prior_answered, is_correct)
        answered_count = len(prior_answered) + 1
        quiz_complete = answered_count >= TOTAL_QUESTIONS
        topic = session.topic
        history = _history_after_answer(session, question, is_correct)
        next_sequence = max(q.sequence_number for q in session.questions) + 1
        feedback = AnswerFeedbackOut(
            is_correct=is_correct,
            correct_option_index=question.correct_option_index,
            explanation=question.explanation,
            explanation_why=question.explanation_why,
            coins=coins,
            quiz_complete=quiz_complete,
        )
    finally:
        db.close()

    if quiz_complete:
        insights = llm_service.generate_insights(topic, history)
        generated = None
        metadata = None
    else:
        insights = None
        generated, metadata = llm_service.generate_question(
            topic, history, next_sequence
        )

    db = SessionLocal()
    try:
        session = get_session(db, session_id)
        question = _require_current_unanswered(session, question_id)
        if selected_option_index != question.correct_option_index:
            raise HTTPException(status_code=409, detail="Answer conflict, please retry")

        db.add(
            StudentAnswer(
                question_id=question.id,
                selected_option_index=selected_option_index,
                is_correct=is_correct,
            )
        )

        def work() -> None:
            nonlocal session
            db.flush()
            db.expire_all()
            session = get_session(db, session_id)

            if quiz_complete:
                session.completed_at = datetime.now(timezone.utc)
                session.summary_json = insights.model_dump()
            else:
                _persist_question(db, session, generated, metadata, next_sequence)

        _run_in_transaction(db, work)

        if coins.coins_earned > 0:
            try:
                wallet_service.credit_coins(db, player_id, coins.coins_earned)
            except Exception:
                logger.exception(
                    "Failed to credit %s coins for player %s after session %s",
                    coins.coins_earned,
                    player_id,
                    session_id,
                )
                raise

        session = get_session(db, session_id)
        return feedback, build_session_out(session)
    finally:
        db.close()
