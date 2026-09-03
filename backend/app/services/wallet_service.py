from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.quiz_policy import DEFAULT_OUTFIT_ID, OUTFIT_COSTS
from app.models import Wallet
from app.schemas import EquipOutfitRequest, PurchaseOutfitRequest, WalletOut


def _normalize_owned(owned: list[str]) -> list[str]:
    valid = set(OUTFIT_COSTS)
    cleaned = [oid for oid in owned if oid in valid]
    if DEFAULT_OUTFIT_ID not in cleaned:
        cleaned.insert(0, DEFAULT_OUTFIT_ID)
    seen: set[str] = set()
    unique: list[str] = []
    for oid in cleaned:
        if oid not in seen:
            seen.add(oid)
            unique.append(oid)
    return unique


def _wallet_out(wallet: Wallet) -> WalletOut:
    owned = _normalize_owned(list(wallet.owned_outfits or []))
    equipped = wallet.equipped_outfit_id if wallet.equipped_outfit_id in owned else DEFAULT_OUTFIT_ID
    return WalletOut(
        player_id=wallet.id,
        coins=wallet.coins,
        owned_outfits=owned,
        equipped_outfit_id=equipped,
    )


def get_or_create_wallet(db: Session, player_id: UUID) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.id == player_id).first()
    if wallet:
        return wallet
    wallet = Wallet(
        id=player_id,
        coins=0,
        owned_outfits=[DEFAULT_OUTFIT_ID],
        equipped_outfit_id=DEFAULT_OUTFIT_ID,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def get_wallet(db: Session, player_id: UUID) -> WalletOut:
    return _wallet_out(get_or_create_wallet(db, player_id))


def credit_coins(db: Session, player_id: UUID, amount: int) -> WalletOut:
    if amount <= 0:
        return get_wallet(db, player_id)
    wallet = get_or_create_wallet(db, player_id)
    wallet.coins += amount
    db.commit()
    db.refresh(wallet)
    return _wallet_out(wallet)


def purchase_outfit(db: Session, player_id: UUID, body: PurchaseOutfitRequest) -> WalletOut:
    if body.outfit_id not in OUTFIT_COSTS:
        raise HTTPException(status_code=404, detail="Outfit not found")
    cost = OUTFIT_COSTS[body.outfit_id]
    wallet = get_or_create_wallet(db, player_id)
    owned = _normalize_owned(list(wallet.owned_outfits or []))
    if body.outfit_id in owned:
        raise HTTPException(status_code=400, detail="Outfit already owned")
    if wallet.coins < cost:
        raise HTTPException(status_code=400, detail="Not enough coins")
    wallet.coins -= cost
    owned.append(body.outfit_id)
    wallet.owned_outfits = owned
    wallet.equipped_outfit_id = body.outfit_id
    db.commit()
    db.refresh(wallet)
    return _wallet_out(wallet)


def equip_outfit(db: Session, player_id: UUID, body: EquipOutfitRequest) -> WalletOut:
    if body.outfit_id not in OUTFIT_COSTS:
        raise HTTPException(status_code=404, detail="Outfit not found")
    wallet = get_or_create_wallet(db, player_id)
    owned = _normalize_owned(list(wallet.owned_outfits or []))
    if body.outfit_id not in owned:
        raise HTTPException(status_code=400, detail="Outfit not owned")
    wallet.equipped_outfit_id = body.outfit_id
    wallet.owned_outfits = owned
    db.commit()
    db.refresh(wallet)
    return _wallet_out(wallet)
