import type { AdminRow } from "../../lib/admin-api";
import {
  PAYMENT_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  formatParisDateTime,
} from "../../lib/admin-format";
import { canCancel, canCopyTicketLink, ticketUrl } from "../../lib/admin-rows";
import { formatTicketNo } from "../../lib/format";
import { ROW_ACTION_CLASSES } from "./admin-classes";
import { CopyTicketLink } from "./CopyTicketLink";

interface ReservationRowProps {
  row: AdminRow;
  isCancelling: boolean;
  onCancel: (row: AdminRow) => void;
}

export function ReservationRow({
  row,
  isCancelling,
  onCancel,
}: ReservationRowProps) {
  const isMuted = row.status !== "paid" && !row.needsRefund;

  return (
    <tr
      className={`border-b border-steel-800 last:border-b-0 ${row.needsRefund ? "bg-alert/10" : ""} ${isMuted ? "text-steel-400" : "text-text"}`}
    >
      <td className="px-3 py-3 font-black whitespace-nowrap">
        {row.ticketNo === null ? "—" : formatTicketNo(row.ticketNo)}
      </td>
      <td className="min-w-36 px-3 py-3 font-bold">
        {row.fullName}
        {row.allergies && (
          <span className="block text-xs font-medium text-steel-400">
            {row.allergies}
          </span>
        )}
      </td>
      <td className="px-3 py-3 font-medium whitespace-nowrap">
        {row.email ?? "—"}
      </td>
      <td className="px-3 py-3 font-bold">{row.covers}</td>
      <td className="px-3 py-3 font-bold">{row.vg}</td>
      <td className="px-3 py-3 whitespace-nowrap">
        {row.needsRefund ? (
          <span className="flex flex-col gap-0.5">
            <span className="font-black text-alert uppercase">
              À rembourser
            </span>
            <span className="text-xs font-bold text-steel-400">
              {STATUS_LABELS[row.status]}
            </span>
          </span>
        ) : (
          <span className="font-bold">{STATUS_LABELS[row.status]}</span>
        )}
      </td>
      <td className="px-3 py-3 font-medium whitespace-nowrap">
        {SOURCE_LABELS[row.source]}
        {row.paymentMethod && ` · ${PAYMENT_LABELS[row.paymentMethod]}`}
      </td>
      <td className="px-3 py-3 font-medium whitespace-nowrap">
        {row.paidAt ? formatParisDateTime(row.paidAt) : "—"}
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center justify-end">
          {canCopyTicketLink(row) && (
            <CopyTicketLink
              url={ticketUrl(window.location.origin, row.id)}
              fullName={row.fullName}
            />
          )}
          {canCancel(row) && (
            <button
              type="button"
              disabled={isCancelling}
              aria-label={`Annuler la réservation de ${row.fullName}`}
              onClick={() => onCancel(row)}
              className={`${ROW_ACTION_CLASSES} hover:text-alert`}
            >
              {isCancelling ? "Annulation…" : "Annuler"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
