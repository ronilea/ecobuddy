import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BuddyAvatar } from "../components/BuddyAvatar";
import { CoinBadge } from "../components/CoinBadge";
import { CoinPrice } from "../components/CoinPrice";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CloseIcon } from "../components/icons";
import { useBuddyProfile } from "../hooks/useBuddyProfile";
import { dicebearUrl } from "../config/outfits";

type ClosetLocationState = {
  returnTo?: string;
};

type PendingPurchase = {
  id: string;
  name: string;
  cost: number;
};

export function ClosetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as ClosetLocationState | null)?.returnTo;
  const { profile, purchaseAndEquipOutfit, equipOutfit, outfits, loading, error } = useBuddyProfile();
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);

  function goBack() {
    navigate(returnTo ?? "/");
  }

  if (loading) {
    return <div className="page page-fit center">Loading store…</div>;
  }
  if (error || !profile) {
    return <div className="page page-fit center error">{error ?? "Wallet unavailable."}</div>;
  }

  function handleOutfitClick(
    outfitId: string,
    name: string,
    cost: number,
    owned: boolean,
    wearing: boolean,
    canAfford: boolean,
  ) {
    if (wearing) return;

    if (owned) {
      void equipOutfit(outfitId).catch((err) => console.error("Equip failed", err));
      return;
    }

    if (!canAfford) return;

    setPendingPurchase({ id: outfitId, name, cost });
  }

  function confirmPurchase() {
    if (!pendingPurchase) return;
    void purchaseAndEquipOutfit(pendingPurchase.id)
      .catch((err) => console.error("Purchase failed", err))
      .finally(() => setPendingPurchase(null));
  }

  return (
    <div className="page page-fit closet-page">
      {pendingPurchase && (
        <ConfirmDialog
          title="Equip outfit?"
          message={`Do you want to equip the ${pendingPurchase.name}?`}
          confirmLabel="Equip"
          onConfirm={confirmPurchase}
          onCancel={() => setPendingPurchase(null)}
        />
      )}
      <header className="store-header">
        <button
          className="btn icon-btn icon-btn--ghost-on-dark"
          type="button"
          aria-label="Close store"
          onClick={goBack}
        >
          <CloseIcon size={22} />
        </button>
        <BuddyAvatar outfitId={profile.equippedOutfitId} mouth="smile" size={36} />
        <h1 className="store-title">Store</h1>
        <CoinBadge coins={profile.coins} variant="pill" />
      </header>

      {returnTo && (
        <p className="closet-hint">Quiz paused — your progress is saved.</p>
      )}

      <div className="outfit-grid">
        {outfits.map((outfit) => {
          const owned = profile.ownedOutfits.includes(outfit.id);
          const wearing = profile.equippedOutfitId === outfit.id;
          const canAfford = profile.coins >= outfit.cost;
          const locked = !owned && !canAfford;

          return (
            <div key={outfit.id} className="outfit-cell">
              <button
                type="button"
                className={`outfit-card ${wearing ? "wearing" : ""} ${locked ? "locked" : ""}`}
                disabled={locked}
                onClick={() =>
                  handleOutfitClick(outfit.id, outfit.name, outfit.cost, owned, wearing, canAfford)
                }
                aria-label={
                  wearing
                    ? `${outfit.name}, currently wearing`
                    : owned
                      ? `Wear ${outfit.name}`
                      : locked
                        ? `${outfit.name}, not enough coins`
                        : `Buy ${outfit.name}`
                }
              >
                <div className="outfit-card-image">
                  <img src={dicebearUrl(outfit)} alt="" width={72} height={72} />
                </div>
                <span className="outfit-card-name">{outfit.name}</span>
                {wearing && <span className="outfit-equipped-tag">Wearing</span>}
              </button>
              {!owned && <CoinPrice amount={outfit.cost} className={locked ? "dimmed" : ""} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
