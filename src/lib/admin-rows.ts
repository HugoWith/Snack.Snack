import type { AdminRow } from "./admin-api";
import { formatTicketNo } from "./format";

export const REFUND_REMINDER = "Pense à rembourser dans SumUp.";

// Rows to refund stay visible even once cancelled: the money is still owed.
export const visibleRows = (rows: AdminRow[], showAll: boolean): AdminRow[] =>
  showAll
    ? rows
    : rows.filter((row) => row.status === "paid" || row.needsRefund);

export const needsRefundReminder = (row: AdminRow): boolean =>
  row.source === "online" && row.status === "paid";

export const canCopyTicketLink = (row: AdminRow): boolean =>
  row.status === "paid" && row.ticketNo !== null;

// Same route and param as the link in the confirmation email.
export const ticketUrl = (origin: string, id: string): string =>
  `${origin}/billet?ref=${id}`;

// Failed and expired rows already hold no seat.
export const canCancel = (row: AdminRow): boolean =>
  row.status === "held" || row.status === "paid";

export const cancelConfirmMessage = (row: AdminRow): string => {
  const ticket =
    row.ticketNo === null ? "" : ` ${formatTicketNo(row.ticketNo)}`;
  const question = `Annuler la réservation${ticket} de ${row.fullName} ? Ses places seront libérées.`;
  return needsRefundReminder(row)
    ? `${question}\n\n${REFUND_REMINDER}`
    : question;
};
