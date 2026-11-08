import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../server/app";
import { createDb, type Db } from "../../server/db";
import type { AdminData } from "../../src/lib/admin-api";
import { createFakeSumUp, SITE_URL } from "../server/helpers";
import { assertLocalTestDb } from "./guard";
import { holdSeats, resetDb, sql } from "./helpers";

// Production reaches Postgres through Supavisor in transaction mode, which
// hangs when one connection pipelines several queries. Default credentials
// of the local pooler (supabase/config.toml, [db.pooler]).
const POOLER_URL =
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:55429/postgres";
const DEADLINE_MS = 3000;

assertLocalTestDb(POOLER_URL);

let db: Db;

beforeEach(async () => {
  await resetDb();
  db = createDb(POOLER_URL);
  // As in production, where the route has already queried: queries launched
  // on a fresh connection are not always pipelined.
  await db.seatsLeft();
});

// A regressed fix leaves its query stuck, and the pooled backend stays in a
// transaction holding a lock on reservations that blocks every later
// truncate: free it first, then drop the client.
afterEach(async () => {
  await sql`
    select pg_terminate_backend(pid) from pg_stat_activity
    where application_name = 'Supavisor'
      and pid <> pg_backend_pid()
      and ((state = 'active' and wait_event = 'ClientRead')
        or state = 'idle in transaction')`;
  await db.end({ timeout: 1 });
});

afterAll(() => sql.end());

describe("createDb through the transaction pooler", () => {
  it("answers the admin list and the seat count launched together", async () => {
    const [rows, { capacity }] = await withinDeadline(
      Promise.all([db.listReservations(), db.seatsLeft()]),
    );

    expect(rows).toEqual([]);
    expect(capacity).toBeGreaterThan(0);
  });

  it("confirms several reservations launched together", async () => {
    const ids = await Promise.all(
      ["a@example.com", "b@example.com", "c@example.com"].map((email) =>
        holdSeats(email),
      ),
    );

    const rows = await withinDeadline(
      Promise.all(
        ids.map(async (id) => {
          await db.confirmPayment(id);
          return db.getReservation(id);
        }),
      ),
    );

    expect(rows.map((row) => row?.status)).toEqual(["paid", "paid", "paid"]);
  });

  it("serves the admin dashboard while paid checkouts reconcile", async () => {
    const ids = await Promise.all(
      ["a@example.com", "b@example.com"].map((email) => holdSeats(email)),
    );
    for (const [index, id] of ids.entries())
      await sql`select attach_checkout(${id}, ${`chk_${index}`})`;
    const app = createApp({
      db,
      sumup: createFakeSumUp("PAID"),
      mailer: null,
      verifyAdmin: async () => ({ email: "admin@example.com" }),
      env: { siteUrl: SITE_URL, priceCents: 4500 },
    });

    const res = await withinDeadline(
      Promise.resolve(app.request("/api/admin/reservations")),
    );

    expect(res.status).toBe(200);
    const { totals } = (await res.json()) as AdminData;
    expect(totals).toMatchObject({ coversPaid: 2, reservations: 2 });
  });
});

const withinDeadline = <T>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`No answer within ${DEADLINE_MS} ms`)),
      DEADLINE_MS,
    );
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
};
