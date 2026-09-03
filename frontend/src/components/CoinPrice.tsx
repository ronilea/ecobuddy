import { CoinIcon } from "./icons";

type Props = {
  amount: number;
  className?: string;
};

export function CoinPrice({ amount, className = "" }: Props) {
  if (amount === 0) {
    return <span className={`coin-price free ${className}`.trim()}>Free</span>;
  }

  return (
    <span className={`coin-price ${className}`.trim()}>
      <span className="coin-price-amount">{amount}</span>
      <CoinIcon size={16} />
    </span>
  );
}
