import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { syncReservation, type Deps } from "../../server/app";
import { createDb, type Db } from "../../server/db";
import { EVENT } from "../../src/event";
import { createFakeMailer, createFakeSumUp } from "../server/helpers";
import {
  confirmPayment,
  getReservation,
  holdSeats,
  resetDb,
  sql,
} from "./helpers";

const clients: Db[] = [];

const connect = (): Db => {
  const db = createDb(import.meta.env.DATABASE_URL as string);
  clients.push(db);
  return db;
};

beforeEach(resetDb);

afterAll(async () => {
  await Promise.all(clients.map((db) => db.end()));
  await sql.end();
});

describe("confirmation email against Postgres", () => {
  it("sends once when two syncs confirm the same payment at the same time", async () => {
    const id = await holdSeats("camille@mail.fr", 2);
    await sql`update reservations set sumup_checkout_id = 'chk_1' where id = ${id}`;
    const mailer = createFakeMailer();
    const sumup = createFakeSumUp("PAID");
    const deps = (): Deps => ({
      db: connect(),
      sumup,
      mailer,
      verifyAdmin: async () => null,
      env: { siteUrl: "http://localhost:8888", priceCents: EVENT.priceCents },
    });
    const [first, second] = [deps(), deps()];
    const row = await first.db.getReservation(id);
    if (!row) throw new Error("missing reservation");

    await Promise.all([
      syncReservation(first, row),
      syncReservation(second, row),
    ]);

    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(mailer.send.mock.calls[0][0].to).toBe("camille@mail.fr");
    expect((await getReservation(id)).ticket_no).toBe(1);
  });

  it("sends once when two polls race on a paid reservation still owed its email", async () => {
    const id = await holdSeats("camille@mail.fr", 1);
    await confirmPayment(id);
    const mailer = createFakeMailer();
    const deps = (): Deps => ({
      db: connect(),
      sumup: createFakeSumUp("PAID"),
      mailer,
      verifyAdmin: async () => null,
      env: { siteUrl: "http://localhost:8888", priceCents: EVENT.priceCents },
    });
    const racers = Array.from({ length: 4 }, deps);
    const row = await racers[0].db.getReservation(id);
    if (!row) throw new Error("missing reservation");

    await Promise.all(racers.map((racer) => syncReservation(racer, row)));

    expect(mailer.send).toHaveBeenCalledTimes(1);
  });
});
