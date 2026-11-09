import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { EVENT } from "../../src/event";
import {
  APPLICATION_NAME,
  adminAdd,
  confirmPayment,
  expireHold,
  getReservation,
  holdSeats,
  resetDb,
  seatsTaken,
  sql,
} from "./helpers";

beforeEach(resetDb);

afterAll(async () => {
  await sql.end();
});

const fillAllSeats = async (prefix: string): Promise<void> => {
  for (let i = 0; i < EVENT.initialCapacity / 2; i++) {
    await holdSeats(`${prefix}${i}@mail.fr`, 2);
  }
};

describe("hold_seats", () => {
  it("hold_seats concurrency", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, (_, i) => holdSeats(`guest${i}@mail.fr`, 1)),
    );

    const held = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected");
    expect(held).toHaveLength(20);
    expect(refused).toHaveLength(5);
    for (const r of refused)
      expect(r.reason).toMatchObject({ message: "SOLD_OUT" });
    expect(await seatsTaken()).toBe(20);

    const [{ connections }] = await sql<{ connections: number }[]>`
      select count(*)::int as connections from pg_stat_activity
      where application_name = ${APPLICATION_NAME}`;
    expect(connections).toBeGreaterThanOrEqual(10);
  });

  it("max per email is case-insensitive", async () => {
    const id = await holdSeats(" Camille@Gmail.com ", 2);
    expect((await getReservation(id)).email).toBe("camille@gmail.com");
    await confirmPayment(id);

    await expect(holdSeats("camille@gmail.com", 1)).rejects.toMatchObject({
      message: "MAX_PER_EMAIL",
    });
  });

  it("stores the declared allergies, null when none", async () => {
    const declared = await holdSeats("a@mail.fr", 1, "Arachides, gluten");
    const silent = await holdSeats("b@mail.fr", 1);

    expect((await getReservation(declared)).allergies).toBe(
      "Arachides, gluten",
    );
    expect((await getReservation(silent)).allergies).toBeNull();
  });

  it("refuses allergies longer than 200 characters", async () => {
    await expect(
      sql`select hold_seats(
        'Camille Durand', 'a@mail.fr', 1, 0,
        ${EVENT.priceCents}, ${EVENT.maxPerEmail}, ${EVENT.holdMinutes},
        ${"a".repeat(201)}
      )`,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("expired hold frees seats", async () => {
    const id = await holdSeats("camille@mail.fr", 2);
    expect(await seatsTaken()).toBe(2);

    await expireHold(id);
    expect(await seatsTaken()).toBe(0);
  });

  it("releases the email's unpaid hold so a retry is not blocked", async () => {
    const first = await holdSeats("camille@mail.fr", 2);
    const other = await holdSeats("other@mail.fr", 1);

    const retry = await holdSeats(" Camille@Mail.fr ", 2);

    expect((await getReservation(first)).status).toBe("expired");
    expect((await getReservation(retry)).status).toBe("held");
    expect((await getReservation(other)).status).toBe("held");
    expect(await seatsTaken()).toBe(3);
  });

  it("keeps the old hold when the retry is refused", async () => {
    const first = await holdSeats("camille@mail.fr", 2);
    await sql`select set_capacity(2)`;

    await expect(holdSeats("camille@mail.fr", 3)).rejects.toMatchObject({
      message: "SOLD_OUT",
    });
    expect((await getReservation(first)).status).toBe("held");
  });

  it("still counts paid covers toward the cap", async () => {
    const paid = await holdSeats("camille@mail.fr", 1);
    await confirmPayment(paid);
    await holdSeats("camille@mail.fr", 1);

    await expect(holdSeats("camille@mail.fr", 2)).rejects.toMatchObject({
      message: "MAX_PER_EMAIL",
    });
    expect(await seatsTaken()).toBe(2);
  });

  it("reads capacity from settings", async () => {
    await sql`select set_capacity(1)`;
    await expect(holdSeats("camille@mail.fr", 2)).rejects.toMatchObject({
      message: "SOLD_OUT",
    });
  });
});

describe("expire_holds", () => {
  it("marks past holds expired and leaves live ones", async () => {
    const past = await holdSeats("past@mail.fr", 1);
    const live = await holdSeats("live@mail.fr", 1);
    await expireHold(past);

    const [{ expired }] = await sql<{ expired: number }[]>`
      select expire_holds() as expired`;
    expect(expired).toBe(1);
    expect((await getReservation(past)).status).toBe("expired");
    expect((await getReservation(live)).status).toBe("held");
  });
});

describe("confirm_payment", () => {
  it("confirm_payment is idempotent", async () => {
    const id = await holdSeats("camille@mail.fr", 2);

    const first = await confirmPayment(id);
    const second = await confirmPayment(id);

    expect(first).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: true,
    });
    expect(second).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: false,
    });
    const row = await getReservation(id);
    expect(row.status).toBe("paid");
    expect(row.paid_at).not.toBeNull();
  });

  it("ticket numbers 1, 2, 3 in confirmation order", async () => {
    const a = await holdSeats("a@mail.fr", 1);
    const b = await holdSeats("b@mail.fr", 1);
    const c = await holdSeats("c@mail.fr", 1);

    expect((await confirmPayment(c)).ticket_no).toBe(1);
    expect((await confirmPayment(a)).ticket_no).toBe(2);
    expect((await confirmPayment(b)).ticket_no).toBe(3);
  });

  it("late payment over capacity", async () => {
    const late = await holdSeats("late@mail.fr", 2);
    await expireHold(late);
    await fillAllSeats("guest");

    const result = await confirmPayment(late);

    expect(result).toEqual({
      ticket_no: null,
      needs_refund: true,
      newly_paid: true,
    });
    expect((await getReservation(late)).status).toBe("paid");
    expect(await seatsTaken()).toBe(20);
  });

  it("late payment of a hold released by a retry gets a ticket if there is room", async () => {
    const first = await holdSeats("camille@mail.fr", 2);
    const retry = await holdSeats("camille@mail.fr", 2);

    const result = await confirmPayment(first);

    expect(result).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: true,
    });
    expect((await getReservation(first)).status).toBe("paid");
    expect((await getReservation(retry)).status).toBe("held");
    expect(await seatsTaken()).toBe(4);
  });

  it("late payment of a hold released by a retry is flagged when full", async () => {
    await sql`select set_capacity(2)`;
    const first = await holdSeats("camille@mail.fr", 2);
    await holdSeats("camille@mail.fr", 2);

    const result = await confirmPayment(first);

    expect(result).toEqual({
      ticket_no: null,
      needs_refund: true,
      newly_paid: true,
    });
    expect(await seatsTaken()).toBe(2);
  });

  it("late payment with room left gets a ticket", async () => {
    const late = await holdSeats("late@mail.fr", 2);
    await expireHold(late);
    await sql`select expire_holds()`;

    const result = await confirmPayment(late);

    expect(result).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: true,
    });
    expect(await seatsTaken()).toBe(2);
  });
});

describe("mark_failed", () => {
  it("only moves held reservations", async () => {
    const held = await holdSeats("held@mail.fr", 1);
    const paid = await holdSeats("paid@mail.fr", 1);
    await confirmPayment(paid);

    await sql`select mark_failed(${held}, 'failed')`;
    await sql`select mark_failed(${paid}, 'expired')`;

    expect((await getReservation(held)).status).toBe("failed");
    expect((await getReservation(paid)).status).toBe("paid");
    expect(await seatsTaken()).toBe(1);
  });
});

describe("attach_checkout", () => {
  it("stores the checkout id", async () => {
    const id = await holdSeats("camille@mail.fr", 1);
    await sql`select attach_checkout(${id}, 'chk_123')`;

    const [row] = await sql<{ sumup_checkout_id: string }[]>`
      select sumup_checkout_id from reservations where id = ${id}`;
    expect(row.sumup_checkout_id).toBe("chk_123");
  });
});

describe("set_capacity", () => {
  it("set_capacity refuses below taken", async () => {
    await holdSeats("a@mail.fr", 2);
    await holdSeats("b@mail.fr", 2);

    await expect(sql`select set_capacity(3)`).rejects.toMatchObject({
      message: "CAPACITY_BELOW_TAKEN",
    });

    await sql`select set_capacity(4)`;
    const [{ capacity }] = await sql<{ capacity: number }[]>`
      select capacity from settings`;
    expect(capacity).toBe(4);
  });
});

describe("admin_add", () => {
  it("admin_add refuses when full", async () => {
    await fillAllSeats("guest");

    await expect(adminAdd("walkin@mail.fr", 1)).rejects.toMatchObject({
      message: "SOLD_OUT",
    });
  });

  it("admin_add ignores per-email limit", async () => {
    const first = await adminAdd("Famille@Mail.fr", 2);
    const second = await adminAdd("famille@mail.fr", 2, "offert");

    expect(first.ticket_no).toBe(1);
    expect(second.ticket_no).toBe(2);
    expect(await seatsTaken()).toBe(4);

    const row = await getReservation(first.id);
    expect(row).toMatchObject({
      email: "famille@mail.fr",
      status: "paid",
      source: "manual",
      payment_method: "liquide",
      amount_cents: 2 * EVENT.priceCents,
    });
    expect((await getReservation(second.id)).amount_cents).toBe(0);
  });

  it("accepts a reservation without email", async () => {
    const { id } = await adminAdd(null, 1, "tpe");
    expect((await getReservation(id)).email).toBeNull();
  });

  it("takes more than two covers on a manual row", async () => {
    const { id } = await adminAdd("groupe@mail.fr", 5);

    expect(await seatsTaken()).toBe(5);
    expect((await getReservation(id)).amount_cents).toBe(5 * EVENT.priceCents);
  });

  it("refuses a manual row that does not fit the seats left", async () => {
    await sql`select set_capacity(4)`;

    await expect(adminAdd("groupe@mail.fr", 5)).rejects.toMatchObject({
      message: "SOLD_OUT",
    });
    expect(await seatsTaken()).toBe(0);
  });
});

describe("covers check", () => {
  it("keeps online rows at two covers at most", async () => {
    await expect(sql`
      insert into reservations (full_name, email, covers, vg, amount_cents, hold_expires_at)
      values ('Camille Durand', 'camille@mail.fr', 3, 0, 0, now())
    `).rejects.toMatchObject({ code: "23514" });
  });

  it("still refuses more than two covers through hold_seats", async () => {
    await expect(holdSeats("camille@mail.fr", 3)).rejects.toMatchObject({
      message: "MAX_PER_EMAIL",
    });
  });

  it("keeps VG within the covers on a manual row", async () => {
    await expect(sql`
      select * from admin_add(
        'Dominique Martin', null, 5, 6, 'liquide', ${EVENT.priceCents}
      )`).rejects.toMatchObject({ code: "23514" });
  });
});

const adminCancel = async (id: string, expected: string): Promise<boolean> => {
  const [row] = await sql<{ cancelled: boolean }[]>`
    select admin_cancel(${id}, ${expected}) as cancelled`;
  return row.cancelled;
};

describe("admin_cancel", () => {
  it("admin_cancel frees seats and keeps ticket_no", async () => {
    const id = await holdSeats("camille@mail.fr", 2);
    await confirmPayment(id);

    expect(await adminCancel(id, "paid")).toBe(true);

    const row = await getReservation(id);
    expect(row.status).toBe("cancelled");
    expect(row.ticket_no).toBe(1);
    expect(row.cancelled_at).not.toBeNull();
    expect(await seatsTaken()).toBe(0);

    const next = await holdSeats("next@mail.fr", 1);
    expect((await confirmPayment(next)).ticket_no).toBe(2);
  });

  it("cancelled hold then paid is flagged for refund", async () => {
    const id = await holdSeats("camille@mail.fr", 2);
    await adminCancel(id, "held");

    const first = await confirmPayment(id);

    expect(first).toEqual({
      ticket_no: null,
      needs_refund: true,
      newly_paid: true,
    });
    const row = await getReservation(id);
    expect(row).toMatchObject({
      status: "cancelled",
      ticket_no: null,
      needs_refund: true,
    });
    expect(row.paid_at).not.toBeNull();
    expect(await seatsTaken()).toBe(0);

    const second = await confirmPayment(id);

    expect(second).toEqual({
      ticket_no: null,
      needs_refund: true,
      newly_paid: false,
    });
    expect((await getReservation(id)).paid_at).toEqual(row.paid_at);
    expect(await seatsTaken()).toBe(0);
  });

  it("cancelled after payment stays a no-op", async () => {
    const id = await holdSeats("camille@mail.fr", 1);
    await confirmPayment(id);
    await adminCancel(id, "paid");

    const result = await confirmPayment(id);

    expect(result).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: false,
    });
    expect((await getReservation(id)).needs_refund).toBe(false);
  });

  it("leaves a row whose status moved since the organiser saw it", async () => {
    const id = await holdSeats("camille@mail.fr", 2);
    await confirmPayment(id);

    expect(await adminCancel(id, "held")).toBe(false);

    const row = await getReservation(id);
    expect(row.status).toBe("paid");
    expect(row.cancelled_at).toBeNull();
    expect(await seatsTaken()).toBe(2);
  });

  it("does not cancel twice", async () => {
    const id = await holdSeats("camille@mail.fr", 1);
    await adminCancel(id, "held");

    expect(await adminCancel(id, "cancelled")).toBe(false);
  });
});

describe("privileges", () => {
  it("client roles cannot execute seat functions", async () => {
    const rows = await sql<{ name: string; role: string; allowed: boolean }[]>`
      select p.proname as name, r.role,
        has_function_privilege(r.role, p.oid, 'execute') as allowed
      from pg_proc p
      cross join (values ('anon'), ('authenticated')) as r(role)
      where p.pronamespace = 'public'::regnamespace
        and p.proname in (
          'seats_taken', 'hold_seats', 'attach_checkout', 'confirm_payment',
          'mark_failed', 'admin_add', 'admin_cancel', 'set_capacity', 'expire_holds'
        )`;

    expect(rows).toHaveLength(18);
    expect(rows.filter((r) => r.allowed)).toEqual([]);
  });

  it("keeps a single hold_seats signature, with the allergies parameter", async () => {
    const rows = await sql<{ pronargs: number }[]>`
      select pronargs from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname = 'hold_seats'`;

    expect(rows).toHaveLength(1);
    expect(rows[0].pronargs).toBe(8);
  });
});
