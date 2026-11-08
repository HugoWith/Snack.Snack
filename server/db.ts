import postgres from "postgres";
import { EVENT } from "../src/event";

export type SeatErrorCode =
  "SOLD_OUT" | "MAX_PER_EMAIL" | "CAPACITY_BELOW_TAKEN";

export class SeatError extends Error {
  readonly code: SeatErrorCode;

  constructor(code: SeatErrorCode) {
    super(code);
    this.name = "SeatError";
    this.code = code;
  }
}

export type ReservationStatus =
  "held" | "paid" | "failed" | "expired" | "cancelled";

export type PaymentMethod = "sumup" | "liquide" | "tpe" | "offert";

export type Reservation = {
  id: string;
  full_name: string;
  email: string | null;
  covers: number;
  vg: number;
  amount_cents: number;
  status: ReservationStatus;
  hold_expires_at: Date;
  sumup_checkout_id: string | null;
  ticket_no: number | null;
  needs_refund: boolean;
  source: "online" | "manual";
  payment_method: PaymentMethod | null;
  email_sent_at: Date | null;
  created_at: Date;
  paid_at: Date | null;
  cancelled_at: Date | null;
};

export type Confirmation = {
  ticket_no: number | null;
  needs_refund: boolean;
  newly_paid: boolean;
};

export type HoldInput = {
  fullName: string;
  email: string;
  covers: number;
  vg: number;
  priceCents: number;
};

export type AdminAddInput = {
  fullName: string;
  email: string | null;
  covers: number;
  vg: number;
  paymentMethod: Exclude<PaymentMethod, "sumup">;
  priceCents: number;
};

export type Db = {
  seatsLeft: () => Promise<{ left: number; capacity: number }>;
  holdSeats: (input: HoldInput) => Promise<string>;
  attachCheckout: (id: string, checkoutId: string) => Promise<void>;
  confirmPayment: (id: string) => Promise<Confirmation>;
  markFailed: (id: string, status: "failed" | "expired") => Promise<void>;
  getReservation: (id: string) => Promise<Reservation | null>;
  getByCheckoutId: (checkoutId: string) => Promise<Reservation | null>;
  listReservations: () => Promise<Reservation[]>;
  adminAdd: (
    input: AdminAddInput,
  ) => Promise<{ id: string; ticket_no: number }>;
  adminCancel: (
    id: string,
    expectedStatus: ReservationStatus,
  ) => Promise<boolean>;
  setCapacity: (capacity: number) => Promise<void>;
  claimEmail: (id: string) => Promise<boolean>;
  releaseEmail: (id: string) => Promise<void>;
  end: () => Promise<void>;
};

// Each seat function runs as its own statement: they take an advisory lock
// and then read clock_timestamp(), not the transaction start time.
export const createDb = (url: string): Db => {
  // One short-lived connection per function instance: frozen serverless
  // containers otherwise keep dead idle sockets and multiply connections.
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    seatsLeft: async () => {
      await sql`select expire_holds()`;
      const [row] = await sql<{ capacity: number; taken: number }[]>`
        select capacity, seats_taken() as taken from settings`;
      return { left: row.capacity - row.taken, capacity: row.capacity };
    },

    holdSeats: ({ fullName, email, covers, vg, priceCents }) =>
      withSeatErrors(async () => {
        const [row] = await sql<{ id: string }[]>`
          select hold_seats(
            ${fullName}, ${email}, ${covers}, ${vg},
            ${priceCents}, ${EVENT.maxPerEmail}, ${EVENT.holdMinutes}
          ) as id`;
        return row.id;
      }),

    attachCheckout: async (id, checkoutId) => {
      await sql`select attach_checkout(${id}, ${checkoutId})`;
    },

    confirmPayment: async (id) => {
      const [row] = await sql<Confirmation[]>`
        select * from confirm_payment(${id})`;
      return row;
    },

    markFailed: async (id, status) => {
      await sql`select mark_failed(${id}, ${status})`;
    },

    getReservation: async (id) => {
      const [row] = await sql<Reservation[]>`
        select * from reservations where id = ${id}`;
      return row ?? null;
    },

    getByCheckoutId: async (checkoutId) => {
      const [row] = await sql<Reservation[]>`
        select * from reservations where sumup_checkout_id = ${checkoutId}`;
      return row ?? null;
    },

    listReservations: async () =>
      sql<Reservation[]>`select * from reservations order by created_at`,

    adminAdd: ({ fullName, email, covers, vg, paymentMethod, priceCents }) =>
      withSeatErrors(async () => {
        const [row] = await sql<{ id: string; ticket_no: number }[]>`
          select * from admin_add(
            ${fullName}, ${email}, ${covers}, ${vg}, ${paymentMethod}, ${priceCents}
          )`;
        return row;
      }),

    adminCancel: async (id, expectedStatus) => {
      const [row] = await sql<{ cancelled: boolean }[]>`
        select admin_cancel(${id}, ${expectedStatus}) as cancelled`;
      return row.cancelled;
    },

    setCapacity: (capacity) =>
      withSeatErrors(async () => {
        await sql`select set_capacity(${capacity})`;
      }),

    // Only the caller that gets the row back sends: the stamp is the lock.
    claimEmail: async (id) => {
      const rows = await sql`
        update reservations set email_sent_at = now()
        where id = ${id} and email_sent_at is null
        returning id`;
      return rows.length === 1;
    },

    releaseEmail: async (id) => {
      await sql`update reservations set email_sent_at = null where id = ${id}`;
    },

    end: () => sql.end(),
  };
};

const RAISE_EXCEPTION = "P0001";
const SEAT_ERROR_CODES: readonly string[] = [
  "SOLD_OUT",
  "MAX_PER_EMAIL",
  "CAPACITY_BELOW_TAKEN",
] satisfies SeatErrorCode[];

const withSeatErrors = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof postgres.PostgresError &&
      error.code === RAISE_EXCEPTION &&
      SEAT_ERROR_CODES.includes(error.message)
    )
      throw new SeatError(error.message as SeatErrorCode);
    throw error;
  }
};
