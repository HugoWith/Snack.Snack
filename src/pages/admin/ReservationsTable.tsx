import { useState } from "react";
import type { AdminRow } from "../../lib/admin-api";
import { paidRowsCaption, visibleRows } from "../../lib/admin-rows";
import {
  HEADING_CLASSES,
  NOTICE_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "./admin-classes";
import { ReservationRow } from "./ReservationRow";
import type { CancelNotice } from "./useAdminData";

interface ReservationsTableProps {
  rows: AdminRow[];
  cancellingId: string | null;
  cancelNotice: CancelNotice | null;
  onCancel: (row: AdminRow) => void;
  onExport: () => void;
}

export function ReservationsTable({
  rows,
  cancellingId,
  cancelNotice,
  onCancel,
  onExport,
}: ReservationsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const shown = visibleRows(rows, showAll);

  return (
    <section
      aria-labelledby="reservations-title"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="reservations-title" className={HEADING_CLASSES}>
            Réservations
          </h2>
          <p className="text-sm font-bold text-steel-400">
            {showAll
              ? `Tous statuts : ${rows.length}.`
              : paidRowsCaption(shown, rows.length)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((current) => !current)}
            className={SECONDARY_BUTTON_CLASSES}
          >
            {showAll ? "Payées seulement" : "Tout afficher"}
          </button>
          <button
            type="button"
            onClick={onExport}
            className={SECONDARY_BUTTON_CLASSES}
          >
            Exporter en CSV
          </button>
        </div>
      </div>
      <p
        role="status"
        className={`${NOTICE_CLASSES} ${cancelNotice?.isAlert ? "text-alert" : "text-text"}`}
      >
        {cancelNotice?.message}
      </p>
      {shown.length === 0 ? (
        <p className="border border-steel-800 px-5 py-8 text-base font-bold text-label">
          {showAll
            ? "Aucune réservation pour l'instant."
            : "Aucune réservation payée pour l'instant. « Tout afficher » montre les paiements en cours."}
        </p>
      ) : (
        <div
          role="region"
          aria-label="Tableau des réservations, défilable"
          tabIndex={0}
          className="relative overflow-x-auto border border-steel-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
        >
          <table className="w-full min-w-[960px] border-collapse text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b border-steel-800 bg-steel-900">
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-3 py-3 text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-label uppercase"
                  >
                    {column}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <ReservationRow
                  key={row.id}
                  row={row}
                  isCancelling={cancellingId === row.id}
                  onCancel={onCancel}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const COLUMNS = [
  "Nº",
  "Nom",
  "Email",
  "Couverts",
  "Dont VG",
  "Statut",
  "Paiement",
  "Payé le",
];
