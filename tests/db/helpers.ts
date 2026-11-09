import postgres from "postgres";
import { EVENT } from "../../src/event";

export interface Confirmation {
  ticket_no: number | null;
  needs_refund: boolean;
  newly_paid: boolean;
}

export interface Reservation {
  id: string;
  email: string | null;
  status: string;
  ticket_no: number | null;
  needs_refund: boolean;
  source: string;
  payment_method: string | null;
  allergies: string | null;
  amount_cents: number;
  paid_at: Date | null;
  cancelled_at: Date | null;
}

export const APPLICATION_NAME = "snack-snack-db-tests";

export const sql = postgres(import.meta.env.DATABASE_URL as string, {
  max: 25,
  onnotice: () => {},
  connection: { application_name: APPLICATION_NAME },
});

export const resetDb = async (): Promise<void> => {
  await sql`truncate reservations`;
  await sql`update settings set capacity = ${EVENT.initialCapacity}`;
};

export const holdSeats = async (
  email: string,
  covers = 1,
  allergies: string | null = null,
): Promise<string> => {
  const [row] = await sql<{ id: string }[]>`
    select hold_seats(
      'Camille Durand', ${email}, ${covers}, 0,
      ${EVENT.priceCents}, ${EVENT.maxPerEmail}, ${EVENT.holdMinutes}, ${allergies}
    ) as id`;
  return row.id;
};

export const confirmPayment = async (id: string): Promise<Confirmation> => {
  const [row] = await sql<Confirmation[]>`select * from confirm_payment(${id})`;
  return row;
};

export const adminAdd = async (
  email: string | null,
  covers: number,
  paymentMethod = "liquide",
): Promise<{ id: string; ticket_no: number }> => {
  const [row] = await sql<{ id: string; ticket_no: number }[]>`
    select * from admin_add(
      'Dominique Martin', ${email}, ${covers}, 0, ${paymentMethod}, ${EVENT.priceCents}
    )`;
  return row;
};

export const seatsTaken = async (): Promise<number> => {
  const [row] = await sql<{ taken: number }[]>`select seats_taken() as taken`;
  return row.taken;
};

export const expireHold = async (id: string): Promise<void> => {
  await sql`
    update reservations
    set hold_expires_at = now() - interval '1 minute'
    where id = ${id}`;
};

export const getReservation = async (id: string): Promise<Reservation> => {
  const [row] = await sql<Reservation[]>`
    select * from reservations where id = ${id}`;
  return row;
};
