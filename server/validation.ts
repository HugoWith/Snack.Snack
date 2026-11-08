import {
  MANUAL_PAYMENT_METHODS,
  validateAdminOrder,
  type ManualPaymentMethod,
} from "../src/lib/admin-order";
import { validateOrder, type OrderInput } from "../src/lib/order";
import type { ReservationStatus } from "./db";

export const parseCheckoutBody = (
  body: unknown,
): { ok: true; value: OrderInput } | { ok: false } => {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return INVALID;

  const { fullName, email, covers, vg, acceptTerms } = body as Record<
    string,
    unknown
  >;
  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    !isInteger(covers) ||
    !isInteger(vg) ||
    acceptTerms !== true
  )
    return INVALID;
  if (covers < 1 || vg < 0 || vg > covers) return INVALID;

  const value: OrderInput = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    covers,
    vg,
    acceptTerms,
  };
  // Seats left are checked by hold_seats under its lock, not here.
  const errors = validateOrder(value, Number.POSITIVE_INFINITY);
  if (Object.keys(errors).length > 0) return INVALID;

  return { ok: true, value };
};

export const parseCapacityBody = (
  body: unknown,
): { ok: true; value: number } | { ok: false } => {
  if (!isRecord(body)) return INVALID;
  const { capacity } = body;
  if (!isInteger(capacity) || capacity < 0) return INVALID;
  return { ok: true, value: capacity };
};

export type AdminReservationBody = {
  fullName: string;
  email: string | null;
  covers: number;
  vg: number;
  paymentMethod: ManualPaymentMethod;
  sendEmail: boolean;
};

export const parseAdminReservationBody = (
  body: unknown,
): { ok: true; value: AdminReservationBody } | { ok: false } => {
  if (!isRecord(body)) return INVALID;

  const {
    fullName,
    email = "",
    covers,
    vg,
    paymentMethod,
    sendEmail = false,
  } = body;
  if (
    typeof fullName !== "string" ||
    (typeof email !== "string" && email !== null) ||
    !isInteger(covers) ||
    !isInteger(vg) ||
    !isManualPaymentMethod(paymentMethod) ||
    typeof sendEmail !== "boolean"
  )
    return INVALID;

  const input = {
    fullName,
    email: (email ?? "").trim().toLowerCase(),
    covers,
    vg,
    paymentMethod,
    sendEmail,
  };
  if (Object.keys(validateAdminOrder(input)).length > 0) return INVALID;

  return {
    ok: true,
    value: {
      ...input,
      fullName: fullName.trim(),
      email: input.email === "" ? null : input.email,
    },
  };
};

export const parseCancelBody = (
  body: unknown,
): { ok: true; value: ReservationStatus } | { ok: false } => {
  if (!isRecord(body) || !isReservationStatus(body.status)) return INVALID;
  return { ok: true, value: body.status };
};

// Unset or empty keeps the event price; anything else must be a whole number
// of cents from 1 up to the event price (it only lowers it, for the 1 € live
// test), or the function refuses to start.
export const parsePriceOverride = (
  raw: string | undefined,
  eventPriceCents: number,
): number => {
  if (raw === undefined || raw === "") return eventPriceCents;
  const cents = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || cents > eventPriceCents)
    throw new Error(
      `PRICE_CENTS_OVERRIDE must be a whole number of cents from 1 to ${eventPriceCents} (e.g. 100 for 1 €)`,
    );
  return cents;
};

// Email is optional: with none of the three set, no email is ever sent and
// the organisers send them by hand. Part of them set is a mistake.
export const parseSmtpEnv = (
  get: (name: string) => string | undefined,
): { user: string; appPassword: string; from: string } | null => {
  const values = SMTP_VARS.map((name) => get(name) ?? "");
  if (values.every((value) => value === "")) return null;
  const missing = SMTP_VARS.filter((_, index) => values[index] === "");
  if (missing.length > 0)
    throw new Error(
      `${missing.join(", ")} not set: set SMTP_USER, SMTP_APP_PASSWORD and MAIL_FROM together, or none of them`,
    );
  const [user, appPassword, from] = values;
  return { user, appPassword, from };
};

const SMTP_VARS = ["SMTP_USER", "SMTP_APP_PASSWORD", "MAIL_FROM"] as const;

const INVALID = { ok: false } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isManualPaymentMethod = (value: unknown): value is ManualPaymentMethod =>
  MANUAL_PAYMENT_METHODS.some((method) => method === value);

const RESERVATION_STATUSES: readonly unknown[] = [
  "held",
  "paid",
  "failed",
  "expired",
  "cancelled",
] satisfies ReservationStatus[];

const isReservationStatus = (value: unknown): value is ReservationStatus =>
  RESERVATION_STATUSES.includes(value);

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);
