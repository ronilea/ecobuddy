import { useEffect, useState } from "react";
import { playCoinSound } from "../utils/coinEffects";
import { CoinIcon } from "./icons";

type Props = {
  amount: number;
  onDone?: () => void;
};

export function CoinBurst({ amount, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (amount <= 0) return;
    playCoinSound();
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [amount, onDone]);

  if (amount <= 0 || !visible) return null;

  return (
    <div className="coin-burst" aria-live="polite">
      <span className="coin-burst-amount">+{amount}</span>
      <CoinIcon size={22} />
    </div>
  );
}
