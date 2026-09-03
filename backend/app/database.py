from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

if not settings.database_url.startswith("postgresql"):
    raise RuntimeError(
        "EcoBuddy requires PostgreSQL. Set DATABASE_URL to a postgresql://… connection string."
    )

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db() -> None:
    """Raise if PostgreSQL is unreachable."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
