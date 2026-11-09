import type { AdminRow } from "./admin-api";
import {
  PAYMENT_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  formatParisDateTime,
} from "./admin-format";

// Excel only reads the file as UTF-8 (accents) with the BOM, and splits
// columns on ";" in a French locale.
export const toCsv = (rows: AdminRow[]): string =>
  BOM + [HEADER, ...rows.map(toLine)].map(toCsvLine).join("\r\n");

const toLine = (row: AdminRow): string[] => [
  row.ticketNo === null ? "" : String(row.ticketNo),
  row.fullName,
  row.email ?? "",
  String(row.covers),
  String(row.vg),
  row.allergies ?? "",
  STATUS_LABELS[row.status],
  SOURCE_LABELS[row.source],
  row.paymentMethod === null ? "" : PAYMENT_LABELS[row.paymentMethod],
  row.needsRefund ? "oui" : "non",
  row.paidAt === null ? "" : formatParisDateTime(row.paidAt),
];

const toCsvLine = (values: string[]): string =>
  values.map((value) => quote(neutraliseFormula(value))).join(";");

// Names come from the public checkout: a leading quote stops a spreadsheet
// from running "=HYPERLINK(...)" and friends (OWASP CSV injection).
const neutraliseFormula = (value: string): string =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

const quote = (value: string): string =>
  /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const BOM = "﻿";

const HEADER = [
  "Nº",
  "Nom",
  "Email",
  "Couverts",
  "Dont VG",
  "Allergies",
  "Statut",
  "Source",
  "Paiement",
  "À rembourser",
  "Payé le",
];
