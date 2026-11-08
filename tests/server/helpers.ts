import { vi } from "vitest";
import type { Deps } from "../../server/app";
import type { Confirmation, Db, Reservation } from "../../server/db";
import type { Mail, Mailer } from "../../server/mailer";
import type { SumUp } from "../../server/sumup";

export const RESERVATION_ID = "0b7f6a4e-3c1d-4e8a-9f2b-5d6c7e8f9a01";
export const CHECKOUT_ID = "chk_123";
export const SITE_URL = "http://localhost:8888";

export const buildReservation = (
  overrides: Partial<Reservation> = {},
): Reservation => ({
  id: RESERVATION_ID,
  full_name: "Camille Durand",
  email: "camille@mail.fr",
  covers: 2,
  vg: 1,
  amount_cents: 9000,
  status: "held",
  hold_expires_at: new Date("2026-11-07T12:30:00Z"),
  sumup_checkout_id: CHECKOUT_ID,
  ticket_no: null,
  needs_refund: false,
  source: "online",
  payment_method: "sumup",
  email_sent_at: null,
  created_at: new Date("2026-11-07T12:00:00Z"),
  paid_at: null,
  cancelled_at: null,
  ...overrides,
});

// In-memory stand-in for the SQL seat functions, limited to the transitions
// the API drives. The real functions are covered by tests/db.
export const createFakeDb = (
  rows: Reservation[] = [],
  store = new Map(rows.map((row) => [row.id, { ...row }])),
) => {
  let nextTicketNo = 1;

  return {
    seatsLeft: vi.fn(async () => ({ left: 20, capacity: 20 })),
    holdSeats: vi.fn(async () => RESERVATION_ID),
    attachCheckout: vi.fn(async () => {}),
    confirmPayment: vi.fn(async (id: string): Promise<Confirmation> => {
      const row = store.get(id);
      if (!row) throw new Error("NOT_FOUND");
      if (row.status === "paid" || (row.status === "cancelled" && row.paid_at))
        return {
          ticket_no: row.ticket_no,
          needs_refund: row.needs_refund,
          newly_paid: false,
        };
      row.paid_at = new Date();
      if (row.status === "cancelled") {
        row.needs_refund = true;
        return { ticket_no: null, needs_refund: true, newly_paid: true };
      }
      row.status = "paid";
      row.ticket_no = nextTicketNo++;
      return {
        ticket_no: row.ticket_no,
        needs_refund: false,
        newly_paid: true,
      };
    }),
    markFailed: vi.fn(async (id: string, status: "failed" | "expired") => {
      const row = store.get(id);
      if (row?.status === "held") row.status = status;
    }),
    getReservation: vi.fn(async (id: string) => {
      const row = store.get(id);
      return row ? { ...row } : null;
    }),
    getByCheckoutId: vi.fn(async (checkoutId: string) => {
      const row = [...store.values()].find(
        (candidate) => candidate.sumup_checkout_id === checkoutId,
      );
      return row ? { ...row } : null;
    }),
    claimEmail: vi.fn(async (id: string) => {
      const row = store.get(id);
      if (!row || row.email_sent_at !== null) return false;
      row.email_sent_at = new Date();
      return true;
    }),
    releaseEmail: vi.fn(async (id: string) => {
      const row = store.get(id);
      if (row) row.email_sent_at = null;
    }),
  } satisfies Partial<Db>;
};

export const createFakeSumUp = (
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" = "PENDING",
) =>
  ({
    createCheckout: vi.fn(async () => ({
      id: CHECKOUT_ID,
      hostedCheckoutUrl: "https://checkout.sumup.com/pay/chk_123",
    })),
    getCheckout: vi.fn(async () => ({ status })),
  }) satisfies SumUp;

// A fetch that never answers on its own; like the real one, it rejects
// when its signal aborts.
export const stubHangingFetch = () => {
  const fetchMock = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

export const createFakeMailer = () =>
  ({ send: vi.fn(async (_mail: Mail) => {}) }) satisfies Mailer;

export const createDeps = ({
  db = {},
  sumup = createFakeSumUp(),
  mailer = createFakeMailer(),
  priceCents = 4500,
}: {
  db?: Partial<Db>;
  sumup?: SumUp;
  mailer?: Mailer | null;
  priceCents?: number;
} = {}): Deps => ({
  db: db as Db,
  sumup,
  mailer,
  verifyAdmin: async () => null,
  env: { siteUrl: SITE_URL, priceCents },
});
