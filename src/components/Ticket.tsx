import { EVENT } from "../event";
import { formatCovers, formatTicketDate, formatTicketNo } from "../lib/format";

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
    { label: "Table:", value: String(EVENT.tableNo) },
    { label: "Covers:", value: formatCovers(covers, vg) },
    { label: "Date:", value: formatTicketDate(EVENT.dateISO) },
    { label: "Server:", value: EVENT.venue.name },
  ];

  return (
    <article
      aria-label={ticketLabel({ ticketNo, fullName, covers, vg })}
      className="relative flex w-full -rotate-2 flex-col gap-[18px] bg-paper px-5 pt-7 pb-[22px] text-ticket-ink shadow-paper"
    >
      <div
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -ml-[42px] h-6 w-[84px] rotate-[4deg] bg-tape opacity-90"
      />
      <div className="flex items-start justify-between gap-4">
        <p className={LABEL_CLASSES}>
          Snack Snack
          <br />
          Édition #{EVENT.edition}
        </p>
        <p className="font-display text-[30px] leading-[0.85] tracking-[-0.055em] text-ticket-value">
          {formatTicketNo(ticketNo)}
        </p>
      </div>
      <div className="relative">
        <dl className="grid grid-cols-2 gap-[14px]">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-[3px]">
              <dt className={LABEL_CLASSES}>{label}</dt>
              <dd className={VALUE_CLASSES}>{value}</dd>
            </div>
          ))}
        </dl>
        <div
          aria-hidden="true"
          className="absolute right-[6px] -bottom-4 h-5 w-6 rounded-[50%_60%_45%_55%] bg-sauce opacity-50"
        />
      </div>
      <p
        className={`border-t-[1.5px] border-ticket-ink pt-2 break-words ${VALUE_CLASSES}`}
      >
        {fullName}
      </p>
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

const LABEL_CLASSES = "text-[10px] font-bold tracking-[0.06em] uppercase";

const VALUE_CLASSES =
  "font-display text-xl leading-none tracking-[-0.03em] text-ticket-value uppercase";
