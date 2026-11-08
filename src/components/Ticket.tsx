import { EVENT } from "../event";
import {
  formatCovers,
  formatTicketDate,
  formatTicketNo,
  streetOf,
} from "../lib/format";
import { ReceiptFooter } from "./receipt/ReceiptFooter";
import {
  RECEIPT_LABEL_CLASSES,
  RECEIPT_VALUE_CLASSES,
} from "./receipt/receipt-classes";
import { ReceiptHeader } from "./receipt/ReceiptHeader";
import { ReceiptRule } from "./receipt/ReceiptRule";
import { TicketField } from "./TicketField";

interface TicketProps {
  ticketNo: number;
  fullName: string;
  covers: number;
  vg: number;
}

// No responsive variants here: the PNG export renders this same component and
// must look identical whatever the visitor's viewport.
export function Ticket({ ticketNo, fullName, covers, vg }: TicketProps) {
  const fields = [
    { label: "Table", value: String(EVENT.tableNo) },
    { label: "Couverts", value: formatCovers(covers, vg) },
    { label: "Date", value: formatTicketDate(EVENT.dateISO) },
    {
      label: "Lieu",
      value: EVENT.venue.name,
      detail: streetOf(EVENT.venue.address),
    },
  ];

  return (
    <article
      aria-label={ticketLabel({ ticketNo, fullName, covers, vg })}
      className="relative w-full -rotate-2"
    >
      <div className="drop-shadow-paper">
        <div className="receipt-edges flex flex-col gap-6 bg-paper px-6 pt-10 pb-9 text-ticket-ink">
          <ReceiptHeader>
            <p className={RECEIPT_LABEL_CLASSES}>
              Billet · Édition #{EVENT.edition}
            </p>
          </ReceiptHeader>
          <div className="flex items-end justify-between gap-4">
            <p className={`min-w-0 break-words ${RECEIPT_VALUE_CLASSES}`}>
              {fullName}
            </p>
            <p className="shrink-0 font-display text-[30px] leading-[0.85] tracking-[-0.055em] text-ticket-value">
              {formatTicketNo(ticketNo)}
            </p>
          </div>
          <ReceiptRule variant="double" />
          <dl className="flex flex-col gap-3.5">
            {fields.map((field) => (
              <TicketField key={field.label} {...field} />
            ))}
          </dl>
          <ReceiptFooter />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="tape-strip absolute -top-3.5 left-1/2 -ml-10 h-7 w-24 rotate-[5deg]"
      />
    </article>
  );
}

const ticketLabel = ({ ticketNo, fullName, covers, vg }: TicketProps): string =>
  [
    `Billet Snack Snack numéro ${ticketNo}`,
    fullName,
    `${covers} ${covers > 1 ? "couverts" : "couvert"}${vg > 0 ? ` dont ${vg} végétarien${vg > 1 ? "s" : ""}` : ""}`,
    `${EVENT.dateLabel.toLowerCase()} à ${EVENT.lunchTime}`,
  ].join(", ");
