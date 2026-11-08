import type { OrderInput } from "./order";

export type SeatsLeft = { left: number; capacity: number };

export type CheckoutError =
  "INVALID" | "SOLD_OUT" | "MAX_PER_EMAIL" | "PAYMENT_UNAVAILABLE";

export type CheckoutResult =
  { ok: true; url: string } | { ok: false; error: CheckoutError };

export type ReservationStatus =
  "held" | "paid" | "failed" | "expired" | "cancelled";

export type ReservationView = {
  status: ReservationStatus;
  ticketNo: number | null;
  fullName: string;
  covers: number;
  vg: number;
  needsRefund: boolean;
  // A failed row with a checkout can still be paid on the same SumUp page.
  hasCheckout: boolean;
};

export const getSeatsLeft = async (
  cache: RequestCache = "default",
): Promise<SeatsLeft> => {
  const res = await fetch("/api/seats-left", { cache });
  if (!res.ok) throw new Error(`seats-left failed: ${res.status}`);
  return res.json();
};

export const createCheckout = async (
  input: OrderInput,
): Promise<CheckoutResult> => {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await res.json().catch(() => null);

  if (res.ok && isRecord(body) && typeof body.url === "string")
    return { ok: true, url: body.url };
  if (isRecord(body) && isCheckoutError(body.error))
    return { ok: false, error: body.error };
  return { ok: false, error: "PAYMENT_UNAVAILABLE" };
};

// netlify dev replaces the body of a 404 with plain text: rely on the status.
export const getReservation = async (
  ref: string,
): Promise<ReservationView | null> => {
  const res = await fetch(`/api/reservation?ref=${encodeURIComponent(ref)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`reservation failed: ${res.status}`);
  return res.json();
};

const CHECKOUT_ERRORS: readonly unknown[] = [
  "INVALID",
  "SOLD_OUT",
  "MAX_PER_EMAIL",
  "PAYMENT_UNAVAILABLE",
] satisfies CheckoutError[];

const isCheckoutError = (value: unknown): value is CheckoutError =>
  CHECKOUT_ERRORS.includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
