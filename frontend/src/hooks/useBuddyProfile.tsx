import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  equipOutfitRequest,
  fetchWallet,
  purchaseOutfit,
  SUPPORT_ERROR,
  type Wallet,
} from "../api/client";
import { OUTFITS } from "../config/outfits";

export type BuddyProfile = {
  coins: number;
  ownedOutfits: string[];
  equippedOutfitId: string;
};

function walletToProfile(wallet: Wallet): BuddyProfile {
  return {
    coins: wallet.coins,
    ownedOutfits: wallet.owned_outfits,
    equippedOutfitId: wallet.equipped_outfit_id,
  };
}

type BuddyProfileContextValue = {
  profile: BuddyProfile | null;
  loading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
  purchaseAndEquipOutfit: (outfitId: string) => Promise<void>;
  equipOutfit: (outfitId: string) => Promise<void>;
  outfits: typeof OUTFITS;
};

const BuddyProfileContext = createContext<BuddyProfileContextValue | null>(null);

export function BuddyProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<BuddyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    const wallet = await fetchWallet();
    setProfile(walletToProfile(wallet));
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWallet()
      .then((wallet) => {
        if (!cancelled) {
          setProfile(walletToProfile(wallet));
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load wallet", err);
        if (!cancelled) {
          setProfile(null);
          setError(SUPPORT_ERROR);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchaseAndEquipOutfit = useCallback(async (outfitId: string) => {
    try {
      const wallet = await purchaseOutfit(outfitId);
      setProfile(walletToProfile(wallet));
      setError(null);
    } catch (err) {
      console.error("Failed to purchase outfit", err);
      setError(SUPPORT_ERROR);
      throw err;
    }
  }, []);

  const equipOutfit = useCallback(async (outfitId: string) => {
    try {
      const wallet = await equipOutfitRequest(outfitId);
      setProfile(walletToProfile(wallet));
      setError(null);
    } catch (err) {
      console.error("Failed to equip outfit", err);
      setError(SUPPORT_ERROR);
      throw err;
    }
  }, []);

  return (
    <BuddyProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        refreshWallet,
        purchaseAndEquipOutfit,
        equipOutfit,
        outfits: OUTFITS,
      }}
    >
      {children}
    </BuddyProfileContext.Provider>
  );
}

export function useBuddyProfile() {
  const context = useContext(BuddyProfileContext);
  if (!context) {
    throw new Error("useBuddyProfile must be used within BuddyProfileProvider");
  }
  return context;
}

export const SESSION_KEY = "ecobuddy_session_id";

export function saveSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

export function loadSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}
