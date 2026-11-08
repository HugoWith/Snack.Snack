import type { ReactNode } from "react";
import type { AdminTotals } from "../../lib/admin-api";
import { formatEuros } from "../../lib/format";
import { LABEL_CLASSES } from "./admin-classes";

interface TotalsProps {
  totals: AdminTotals;
}

export function Totals({ totals }: TotalsProps) {
  return (
    <section aria-label="Totaux">
      <dl className="grid grid-cols-2 gap-px bg-steel-800 lg:grid-cols-4">
        <Total label="Couverts payés">
          {totals.coversPaid}
          <span className="text-steel-400">/{totals.capacity}</span>
        </Total>
        <Total label="Dont VG">{totals.vgCovers}</Total>
        <Total label="Encaissé">{formatEuros(totals.amountCents)}</Total>
        <Total label="Réservations">{totals.reservations}</Total>
      </dl>
    </section>
  );
}

interface TotalProps {
  label: string;
  children: ReactNode;
}

function Total({ label, children }: TotalProps) {
  return (
    <div className="flex flex-col gap-3 bg-steel-900 px-5 py-5 lg:px-6">
      <dt className={LABEL_CLASSES}>{label}</dt>
      <dd className="font-display text-[32px] leading-none tracking-[-0.04em] text-text tabular-nums lg:text-[40px]">
        {children}
      </dd>
    </div>
  );
}
