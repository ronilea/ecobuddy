import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  equipOutfitRequest,
  fetchWallet,
  purchaseOutfit,
  SUPPORT_ERROR,
  type Wallet,
} from "../api/client";
import { OUTFITS } from "../config/outfits";

export const walletQueryKey = ["wallet"] as const;

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
  const queryClient = useQueryClient();

  const {
    data: wallet,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: walletQueryKey,
    queryFn: fetchWallet,
  });

  const purchaseMutation = useMutation({
    mutationFn: purchaseOutfit,
    onSuccess: (updated) => {
      queryClient.setQueryData(walletQueryKey, updated);
    },
  });

  const equipMutation = useMutation({
    mutationFn: equipOutfitRequest,
    onSuccess: (updated) => {
      queryClient.setQueryData(walletQueryKey, updated);
    },
  });

  const profile = wallet ? walletToProfile(wallet) : null;
  const mutationError =
    purchaseMutation.isError || equipMutation.isError ? SUPPORT_ERROR : null;
  const error = isError ? SUPPORT_ERROR : mutationError;

  const refreshWallet = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const purchaseAndEquipOutfit = useCallback(
    async (outfitId: string) => {
      await purchaseMutation.mutateAsync(outfitId);
    },
    [purchaseMutation],
  );

  const equipOutfit = useCallback(
    async (outfitId: string) => {
      await equipMutation.mutateAsync(outfitId);
    },
    [equipMutation],
  );

  return (
    <BuddyProfileContext.Provider
      value={{
        profile,
        loading: isLoading,
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
