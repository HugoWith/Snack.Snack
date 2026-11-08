import type { AdminRow, PaymentMethod } from "./admin-api";
import type { ReservationStatus } from "./api";

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  paid: "Payé",
  held: "En attente",
  failed: "Échoué",
  expired: "Expiré",
  cancelled: "Annulé",
};

export const SOURCE_LABELS: Record<AdminRow["source"], string> = {
  online: "En ligne",
  manual: "Manuel",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  sumup: "SumUp",
  liquide: "Liquide",
  tpe: "TPE",
  offert: "Offert",
};

// The event and its organisers are in Marseille, whatever the browser says.
const PARIS_DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatParisDateTime = (iso: string): string =>
  PARIS_DATE_TIME.format(new Date(iso)).replace(",", "");
