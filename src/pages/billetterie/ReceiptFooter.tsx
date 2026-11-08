import { EVENT } from "../../event";
import { weekdayOf } from "../../lib/format";
import { ReceiptRule } from "./ReceiptRule";

export function ReceiptFooter() {
  return (
    <div className="flex flex-col gap-4">
      <ReceiptRule variant="dashed" />
      <p className="text-center text-[11px] font-bold tracking-[0.06em] uppercase">
        Merci · À {weekdayOf(EVENT.dateLabel)}
      </p>
    </div>
  );
}
