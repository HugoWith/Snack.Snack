import { EVENT } from "../../event";
import { formatTableLine, streetOf } from "../../lib/format";
import { ReceiptRule } from "./ReceiptRule";

export function ReceiptHeader() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center uppercase">
        <p className="font-display text-[22px] leading-none tracking-[-0.05em] text-ticket-value">
          Snack Snack
        </p>
        <p className="text-[11px] font-bold tracking-[0.06em]">
          {EVENT.venue.name} · {streetOf(EVENT.venue.address)}
        </p>
        <p className="text-[11px] font-bold tracking-[0.06em] tabular-nums">
          {formatTableLine(EVENT.tableNo, EVENT.dateISO)}
        </p>
      </div>
      <ReceiptRule variant="dashed" />
    </div>
  );
}
