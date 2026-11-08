import { formatEuros } from "../../lib/format";
import { AmountTicker } from "./AmountTicker";
import { ReceiptLeader } from "../../components/receipt/ReceiptLeader";
import { ReceiptRule } from "../../components/receipt/ReceiptRule";

interface ReceiptTotalProps {
  totalCents: number;
}

export function ReceiptTotal({ totalCents }: ReceiptTotalProps) {
  const amount = formatEuros(totalCents);

  return (
    <div className="flex flex-col gap-4">
      <ReceiptRule variant="double" />
      <p className="flex items-baseline gap-3">
        <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
          Total
        </span>
        <ReceiptLeader />
        <span className="font-display text-[22px] leading-none tracking-[-0.05em] text-ticket-value tabular-nums">
          <span className="sr-only">{amount}</span>
          <AmountTicker value={amount} />
        </span>
      </p>
    </div>
  );
}
