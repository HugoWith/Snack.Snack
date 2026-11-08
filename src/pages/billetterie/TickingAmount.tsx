import { AmountTicker } from "./AmountTicker";

interface TickingAmountProps {
  value: string;
  className?: string;
}

export function TickingAmount({ value, className = "" }: TickingAmountProps) {
  return (
    <output aria-live="polite" className={className}>
      <span className="sr-only">{value}</span>
      <AmountTicker value={value} />
    </output>
  );
}
