import type { AdminRow } from "./admin-api";
import { toCsv } from "./csv";

export const downloadCsv = (rows: AdminRow[]): void => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `snack-snack-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  // Safari can drop the download if the URL is revoked in the same task.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
