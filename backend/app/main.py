from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.quiz_policy import SUGGESTED_TOPICS
from app.database import Base, check_db, engine
from app import models  # noqa: F401 — register tables for create_all
from app.errors import USER_FACING_ERROR
from app.routers import sessions, wallet
from app.services import llm_service

logger = logging.getLogger(__name__)


def _configure_llm() -> None:
    if settings.mock_llm:
        llm_service.configure(llm_service.MockBackend())
        logger.info("LLM backend: mock")
        return
    llm_service.configure(
        llm_service.OpenAIBackend(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            timeout=settings.openai_timeout,
        )
    )
    logger.info("LLM backend: OpenAI (%s)", settings.openai_model)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        check_db()
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("PostgreSQL unavailable at startup")
        raise RuntimeError(
            "PostgreSQL is required and could not be reached. "
            "Start it with: docker compose up -d db"
        ) from None
    _configure_llm()
    yield


app = FastAPI(title="EcoBuddy API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(wallet.router)


@app.get("/api/health")
def health():
    try:
        check_db()
    except Exception:
        logger.exception("Health check: database unreachable")
        raise HTTPException(status_code=503, detail=USER_FACING_ERROR) from None
    return {"status": "ok"}


@app.get("/api/topics")
def topics():
    return {"topics": SUGGESTED_TOPICS}
