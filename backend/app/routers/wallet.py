from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_player_id
from app.errors import USER_FACING_ERROR
from app.schemas import EquipOutfitRequest, PurchaseOutfitRequest, WalletOut
from app.services import wallet_service

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
def get_wallet(
    db: Session = Depends(get_db),
    player_id: UUID = Depends(require_player_id),
):
    return wallet_service.get_wallet(db, player_id)


@router.post("/purchase", response_model=WalletOut)
def purchase_outfit(
    body: PurchaseOutfitRequest,
    db: Session = Depends(get_db),
    player_id: UUID = Depends(require_player_id),
):
    try:
        return wallet_service.purchase_outfit(db, player_id, body)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=USER_FACING_ERROR) from exc


@router.post("/equip", response_model=WalletOut)
def equip_outfit(
    body: EquipOutfitRequest,
    db: Session = Depends(get_db),
    player_id: UUID = Depends(require_player_id),
):
    try:
        return wallet_service.equip_outfit(db, player_id, body)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=USER_FACING_ERROR) from exc
