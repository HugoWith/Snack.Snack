import type { AdminOrderInput, ManualPaymentMethod } from "./admin-order";
import type { ReservationStatus } from "./api";

export type PaymentMethod = "sumup" | ManualPaymentMethod;

export type AdminRow = {
  id: string;
  ticketNo: number | null;
  fullName: string;
  email: string | null;
  covers: number;
  vg: number;
  allergies: string | null;
  status: ReservationStatus;
  source: "online" | "manual";
  paymentMethod: PaymentMethod | null;
  needsRefund: boolean;
  paidAt: string | null;
  createdAt: string;
};

export type AdminTotals = {
  coversPaid: number;
  capacity: number;
  vgCovers: number;
  amountCents: number;
  reservations: number;
};

export type AdminData = {
  totals: AdminTotals;
  rows: AdminRow[];
  // false when SMTP is not configured: emails go out by hand.
  emailEnabled: boolean;
};

export type EmailOutcome = "sent" | "failed" | "none";

export type AdminAdded = { id: string; ticketNo: number; email: EmailOutcome };

export type AdminError =
  | "UNAUTHORIZED"
  | "INVALID"
  | "SOLD_OUT"
  | "CAPACITY_BELOW_TAKEN"
  | "NOT_FOUND"
  | "CHANGED"
  | "UNAVAILABLE";

export type AdminResult<T> =
  { ok: true; value: T } | { ok: false; error: AdminError };

export const getAdminData = (token: string): Promise<AdminResult<AdminData>> =>
  request(token, "/api/admin/reservations");

export const saveCapacity = (
  token: string,
  capacity: number,
): Promise<AdminResult<{ capacity: number }>> =>
  request(token, "/api/admin/capacity", { capacity });

export const addReservation = (
  token: string,
  input: AdminOrderInput,
): Promise<AdminResult<AdminAdded>> =>
  request(token, "/api/admin/reservations", input);

// The server only cancels if the row is still in the status shown.
export const cancelReservation = (
  token: string,
  id: string,
  status: ReservationStatus,
): Promise<AdminResult<{ id: string }>> =>
  request(token, `/api/admin/reservations/${encodeURIComponent(id)}/cancel`, {
    status,
  });

// netlify dev replaces the body of a 404 with plain text: rely on the status.
const request = async <T>(
  token: string,
  path: string,
  body?: unknown,
): Promise<AdminResult<T>> => {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, error: "UNAVAILABLE" };
  if (res.status === 401) return { ok: false, error: "UNAUTHORIZED" };
  if (res.status === 404) return { ok: false, error: "NOT_FOUND" };

  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, value: payload as T };
  if (isRecord(payload) && isAdminError(payload.error))
    return { ok: false, error: payload.error };
  return { ok: false, error: "UNAVAILABLE" };
};

const ADMIN_ERRORS: readonly unknown[] = [
  "UNAUTHORIZED",
  "INVALID",
  "SOLD_OUT",
  "CAPACITY_BELOW_TAKEN",
  "NOT_FOUND",
  "CHANGED",
  "UNAVAILABLE",
] satisfies AdminError[];

const isAdminError = (value: unknown): value is AdminError =>
  ADMIN_ERRORS.includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
