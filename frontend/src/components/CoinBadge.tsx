import { useEffect, useRef } from "react";
import { CoinIcon } from "./icons";

type Props = {
  coins: number;
  className?: string;
  variant?: "default" | "pill";
};

export function CoinBadge({ coins, className = "", variant = "default" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevCoins = useRef(coins);

  useEffect(() => {
    if (coins > prevCoins.current && ref.current) {
      ref.current.classList.remove("coin-pulse");
      void ref.current.offsetWidth;
      ref.current.classList.add("coin-pulse");
    }
    prevCoins.current = coins;
  }, [coins]);

  return (
    <span
      ref={ref}
      className={`coin-badge coin-badge--${variant} ${className}`.trim()}
    >
      <CoinIcon size={variant === "pill" ? 20 : 18} />
      <span className="coin-badge-amount">{coins}</span>
    </span>
  );
}
