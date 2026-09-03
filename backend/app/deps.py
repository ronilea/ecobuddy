from uuid import UUID

from fastapi import Header, HTTPException


def require_player_id(x_player_id: str | None = Header(default=None, alias="X-Player-Id")) -> UUID:
    if not x_player_id:
        raise HTTPException(status_code=400, detail="X-Player-Id header required")
    try:
        return UUID(x_player_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-Player-Id") from exc
