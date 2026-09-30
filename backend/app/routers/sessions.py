from uuid import UUID

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_player_id
from app.errors import USER_FACING_ERROR
from app.schemas import CreateSessionRequest, SessionOut, SubmitAnswerRequest
from app.services import quiz_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _handle_service_error(exc: Exception) -> None:
    if isinstance(exc, HTTPException):
        if exc.status_code >= 500 or exc.status_code == 502:
            logger.exception("Session request failed")
            raise HTTPException(status_code=exc.status_code, detail=USER_FACING_ERROR) from exc
        raise exc
    logger.exception("Session request failed")
    raise HTTPException(status_code=502, detail=USER_FACING_ERROR) from exc


@router.post("", response_model=SessionOut)
def create_session(body: CreateSessionRequest):
    try:
        return quiz_service.create_session(body.topic)
    except Exception as exc:
        _handle_service_error(exc)


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    session = quiz_service.get_session(db, session_id)
    return quiz_service.build_session_out(session)


@router.post("/{session_id}/answers")
def submit_answer(
    session_id: UUID,
    body: SubmitAnswerRequest,
    player_id: UUID = Depends(require_player_id),
):
    try:
        feedback, session = quiz_service.submit_answer(
            session_id,
            body.question_id,
            body.selected_option_index,
            player_id=player_id,
        )
        return {"feedback": feedback, "session": session}
    except Exception as exc:
        _handle_service_error(exc)
