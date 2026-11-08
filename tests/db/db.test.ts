import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, SeatError, type SeatErrorCode } from "../../server/db";
import { EVENT } from "../../src/event";
import { expireHold, getReservation, resetDb, sql } from "./helpers";

const db = createDb(import.meta.env.DATABASE_URL as string);

const hold = (email: string, covers = 1): Promise<string> =>
  db.holdSeats({
    fullName: "Camille Durand",
    email,
    covers,
    vg: 0,
    priceCents: EVENT.priceCents,
  });

const isSeatError =
  (code: SeatErrorCode) =>
  (error: unknown): boolean =>
    error instanceof SeatError && error.code === code;

beforeEach(resetDb);

afterAll(async () => {
  await db.end();
  await sql.end();
});

describe("createDb", () => {
  it("reports every seat free on an empty base", async () => {
    expect(await db.seatsLeft()).toEqual({
      left: EVENT.initialCapacity,
      capacity: EVENT.initialCapacity,
    });
  });

  it("expires stale holds before counting", async () => {
    const id = await hold("a@example.com", 2);
    expect((await db.seatsLeft()).left).toBe(EVENT.initialCapacity - 2);

    await expireHold(id);

    expect((await db.seatsLeft()).left).toBe(EVENT.initialCapacity);
    expect((await getReservation(id)).status).toBe("expired");
  });

  it("maps SOLD_OUT to a SeatError", async () => {
    await db.setCapacity(1);

    await expect(hold("a@example.com", 2)).rejects.toSatisfy(
      isSeatError("SOLD_OUT"),
    );
  });

  it("maps MAX_PER_EMAIL to a SeatError", async () => {
    await db.confirmPayment(await hold("a@example.com", 2));

    await expect(hold("a@example.com", 1)).rejects.toSatisfy(
      isSeatError("MAX_PER_EMAIL"),
    );
  });

  it("maps CAPACITY_BELOW_TAKEN to a SeatError", async () => {
    await hold("a@example.com", 2);

    await expect(db.setCapacity(1)).rejects.toSatisfy(
      isSeatError("CAPACITY_BELOW_TAKEN"),
    );
  });

  it("lets other SQL errors through unchanged", async () => {
    const error = await db
      .markFailed("00000000-0000-0000-0000-000000000000", "paid" as "failed")
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(SeatError);
    expect(error).toMatchObject({ message: "INVALID_STATUS" });
  });

  it("confirms a payment and finds it by checkout id", async () => {
    const id = await hold("a@example.com", 2);
    await db.attachCheckout(id, "chk_1");

    expect(await db.confirmPayment(id)).toEqual({
      ticket_no: 1,
      needs_refund: false,
      newly_paid: true,
    });
    expect(await db.getByCheckoutId("chk_1")).toMatchObject({
      id,
      status: "paid",
      ticket_no: 1,
    });
  });

  it("returns null for an unknown reservation", async () => {
    expect(
      await db.getReservation("00000000-0000-0000-0000-000000000000"),
    ).toBe(null);
    expect(await db.getByCheckoutId("chk_missing")).toBe(null);
  });

  it("lists a cancelled row paid late with its refund flag", async () => {
    const id = await hold("a@example.com", 1);
    expect(await db.adminCancel(id, "held")).toBe(true);
    await db.confirmPayment(id);

    const [row] = await db.listReservations();

    expect(row).toMatchObject({
      id,
      status: "cancelled",
      needs_refund: true,
    });
  });

  it("adds a manual reservation with a ticket number", async () => {
    const added = await db.adminAdd({
      fullName: "Dominique Martin",
      email: null,
      covers: 2,
      vg: 1,
      paymentMethod: "liquide",
      priceCents: EVENT.priceCents,
    });

    expect(added.ticket_no).toBe(1);
    expect(await db.getReservation(added.id)).toMatchObject({
      source: "manual",
      email: null,
      amount_cents: 2 * EVENT.priceCents,
    });
  });

  it("claims the email once and stamps it", async () => {
    const id = await hold("a@example.com", 1);

    expect(await db.claimEmail(id)).toBe(true);
    expect(await db.claimEmail(id)).toBe(false);
    expect((await db.getReservation(id))?.email_sent_at).toBeInstanceOf(Date);
  });

  it("lets a released email be claimed again", async () => {
    const id = await hold("a@example.com", 1);
    await db.claimEmail(id);

    await db.releaseEmail(id);

    expect((await db.getReservation(id))?.email_sent_at).toBe(null);
    expect(await db.claimEmail(id)).toBe(true);
  });

  it("reports a cancel refused because the status moved", async () => {
    const id = await hold("a@example.com", 1);
    await db.confirmPayment(id);

    expect(await db.adminCancel(id, "held")).toBe(false);
    expect((await getReservation(id)).status).toBe("paid");
  });

  it("grants the claim to a single caller under concurrency", async () => {
    const id = await hold("a@example.com", 1);
    const clients = Array.from({ length: 8 }, () =>
      createDb(import.meta.env.DATABASE_URL as string),
    );

    const claims = await Promise.all(
      clients.map((client) => client.claimEmail(id)),
    );
    await Promise.all(clients.map((client) => client.end()));

    expect(claims.filter(Boolean)).toHaveLength(1);
  });
});
