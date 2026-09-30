import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  equipOutfitRequest,
  fetchWallet,
  purchaseOutfit,
  SUPPORT_ERROR,
  type Wallet,
} from "../api/client";

export const walletQueryKey = ["wallet"] as const;

export type WalletProfile = {
  coins: number;
  ownedOutfits: string[];
  equippedOutfitId: string;
};

function walletToProfile(wallet: Wallet): WalletProfile {
  return {
    coins: wallet.coins,
    ownedOutfits: wallet.owned_outfits,
    equippedOutfitId: wallet.equipped_outfit_id,
  };
}

export function useWallet() {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
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

  const profile = walletQuery.data ? walletToProfile(walletQuery.data) : null;
  const mutationFailed = purchaseMutation.isError || equipMutation.isError;
  const error = walletQuery.isError || mutationFailed ? SUPPORT_ERROR : null;

  return {
    profile,
    loading: walletQuery.isLoading,
    error,
    refreshWallet: () => walletQuery.refetch(),
    purchaseOutfit: purchaseMutation.mutateAsync,
    equipOutfit: equipMutation.mutateAsync,
  };
}
