import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVerifyAdmin, parseAdminEmails } from "../../server/admin-auth";
import { createApp } from "../../server/app";
import {
  SeatError,
  type AdminAddInput,
  type Reservation,
} from "../../server/db";
import {
  CHECKOUT_ID,
  RESERVATION_ID,
  SITE_URL,
  buildReservation,
  createDeps,
  createFakeDb,
  createFakeMailer,
  createFakeSumUp,
} from "./helpers";

const getUser = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn(() => ({ auth: { getUser } })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const ADMIN_TOKEN = "admin-token";
const OUTSIDER_TOKEN = "outsider-token";
const ADMIN_HEADERS = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const MANUAL_ID = "5a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

getUser.mockImplementation(async (token: string) => {
  if (token === ADMIN_TOKEN)
    return { data: { user: { email: "Admin@Example.test" } }, error: null };
  if (token === OUTSIDER_TOKEN)
    return { data: { user: { email: "someone@else.test" } }, error: null };
  return { data: { user: null }, error: new Error("invalid JWT") };
});

const verifyAdmin = createVerifyAdmin({
  supabaseUrl: "http://127.0.0.1:55421",
  anonKey: "anon",
  adminEmails: ["admin@example.test"],
});

// Seat-taking rows follow seats_taken(): paid without refund, or a live hold.
const createFakeAdminDb = (rows: Reservation[], capacity = 20) => {
  const store = new Map(rows.map((row) => [row.id, { ...row }]));
  const base = createFakeDb(rows, store);
  const state = { capacity };
  const taken = (): number =>
    [...store.values()]
      .filter(
        (row) =>
          (row.status === "paid" && !row.needs_refund) || row.status === "held",
      )
      .reduce((sum, row) => sum + row.covers, 0);

  return {
    ...base,
    seatsLeft: vi.fn(async () => ({
      left: state.capacity - taken(),
      capacity: state.capacity,
    })),
    getReservation: vi.fn(async (id: string) => {
      const row = store.get(id);
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
    listReservations: vi.fn(async () => [...store.values()]),
    adminAdd: vi.fn(async (input: AdminAddInput) => {
      if (taken() + input.covers > state.capacity)
        throw new SeatError("SOLD_OUT");
      const ticketNo = 9;
      store.set(
        MANUAL_ID,
        buildReservation({
          id: MANUAL_ID,
          full_name: input.fullName,
          email: input.email,
          covers: input.covers,
          vg: input.vg,
          amount_cents:
            input.paymentMethod === "offert"
              ? 0
              : input.covers * input.priceCents,
          status: "paid",
          sumup_checkout_id: null,
          ticket_no: ticketNo,
          source: "manual",
          payment_method: input.paymentMethod,
          paid_at: new Date("2026-11-07T13:00:00Z"),
        }),
      );
      return { id: MANUAL_ID, ticket_no: ticketNo };
    }),
    adminCancel: vi.fn(async (id: string, expected: string) => {
      const row = store.get(id);
      if (!row || row.status !== expected || row.status === "cancelled")
        return false;
      row.status = "cancelled";
      return true;
    }),
    setCapacity: vi.fn(async (next: number) => {
      if (next < taken()) throw new SeatError("CAPACITY_BELOW_TAKEN");
      state.capacity = next;
    }),
  };
};

const PAID = buildReservation({
  status: "paid",
  ticket_no: 1,
  amount_cents: 9000,
  covers: 2,
  vg: 1,
  paid_at: new Date("2026-11-07T12:05:00Z"),
});

const setup = (
  rows: Reservation[] = [PAID],
  capacity = 20,
  sumup: ReturnType<typeof createFakeSumUp> = createFakeSumUp(),
) => {
  const db = createFakeAdminDb(rows, capacity);
  const mailer = createFakeMailer();
  const app = createApp({ ...createDeps({ db, mailer, sumup }), verifyAdmin });
  return { db, mailer, sumup, app };
};

const post = (
  body: unknown,
  headers: Record<string, string> = ADMIN_HEADERS,
) => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const NEW_RESERVATION = {
  fullName: "Léa Martin",
  email: "",
  covers: 1,
  vg: 0,
  paymentMethod: "liquide",
  sendEmail: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases the comma-separated list", () => {
    expect(parseAdminEmails(" A@x.fr, b@Y.fr ,, ")).toEqual([
      "a@x.fr",
      "b@y.fr",
    ]);
  });
});

describe("createVerifyAdmin", () => {
  it("returns the whitelisted email whatever its case", async () => {
    expect(await verifyAdmin(`Bearer ${ADMIN_TOKEN}`)).toEqual({
      email: "admin@example.test",
    });
    expect(getUser).toHaveBeenCalledWith(ADMIN_TOKEN);
  });

  it("refuses a valid session outside the whitelist", async () => {
    expect(await verifyAdmin(`Bearer ${OUTSIDER_TOKEN}`)).toBeNull();
  });

  it("refuses an invalid token", async () => {
    expect(await verifyAdmin("Bearer nope")).toBeNull();
  });

  it("refuses a missing or non-bearer header without calling Supabase", async () => {
    getUser.mockClear();

    expect(await verifyAdmin(undefined)).toBeNull();
    expect(await verifyAdmin(`Basic ${ADMIN_TOKEN}`)).toBeNull();
    expect(await verifyAdmin("Bearer ")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("admin routes", () => {
  const ROUTES: [string, string, unknown?][] = [
    ["GET", "/api/admin/reservations"],
    ["POST", "/api/admin/capacity", { capacity: 18 }],
    ["POST", "/api/admin/reservations", NEW_RESERVATION],
    ["POST", `/api/admin/reservations/${RESERVATION_ID}/cancel`],
  ];

  it.each(ROUTES)(
    "%s %s answers 401 without a session",
    async (method, path, body) => {
      const { app, db } = setup();

      const res = await app.request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      expect(res.status).toBe(401);
      expect(db.listReservations).not.toHaveBeenCalled();
      expect(db.setCapacity).not.toHaveBeenCalled();
      expect(db.adminAdd).not.toHaveBeenCalled();
      expect(db.adminCancel).not.toHaveBeenCalled();
    },
  );

  it.each(ROUTES)(
    "%s %s answers 401 to an email outside the whitelist",
    async (method, path, body) => {
      const { app, db } = setup();

      const res = await app.request(path, {
        method,
        headers: {
          Authorization: `Bearer ${OUTSIDER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      expect(res.status).toBe(401);
      expect(db.listReservations).not.toHaveBeenCalled();
      expect(db.setCapacity).not.toHaveBeenCalled();
      expect(db.adminAdd).not.toHaveBeenCalled();
      expect(db.adminCancel).not.toHaveBeenCalled();
    },
  );
});

describe("GET /api/admin/reservations", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T13:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("totals only the paid rows that hold a seat", async () => {
    const { app } = setup([
      PAID,
      buildReservation({
        id: "a0000000-0000-4000-8000-000000000002",
        status: "paid",
        ticket_no: 2,
        covers: 1,
        vg: 1,
        amount_cents: 4500,
        source: "manual",
        payment_method: "liquide",
        paid_at: new Date("2026-11-07T12:10:00Z"),
      }),
      buildReservation({
        id: "a0000000-0000-4000-8000-000000000003",
        status: "paid",
        needs_refund: true,
        covers: 2,
        vg: 2,
        amount_cents: 9000,
        paid_at: new Date("2026-11-07T12:20:00Z"),
      }),
      buildReservation({
        id: "a0000000-0000-4000-8000-000000000004",
        status: "cancelled",
        ticket_no: 3,
        covers: 2,
        vg: 0,
        amount_cents: 9000,
        paid_at: new Date("2026-11-07T12:15:00Z"),
      }),
      buildReservation({
        id: "a0000000-0000-4000-8000-000000000005",
        status: "held",
      }),
    ]);

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body.totals).toEqual({
      coversPaid: 3,
      capacity: 20,
      vgCovers: 2,
      amountCents: 13500,
      reservations: 2,
    });
    expect(body.rows).toHaveLength(5);
  });

  it("maps each row to the admin view", async () => {
    const { app } = setup([PAID]);

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect((await res.json()).rows).toEqual([
      {
        id: RESERVATION_ID,
        ticketNo: 1,
        fullName: "Camille Durand",
        email: "camille@mail.fr",
        covers: 2,
        vg: 1,
        allergies: null,
        status: "paid",
        source: "online",
        paymentMethod: "sumup",
        needsRefund: false,
        paidAt: "2026-11-07T12:05:00.000Z",
        createdAt: "2026-11-07T12:00:00.000Z",
      },
    ]);
  });

  it("shows the declared allergies to the organisers", async () => {
    const { app } = setup([buildReservation({ allergies: "Arachides" })]);

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect((await res.json()).rows[0]).toMatchObject({
      allergies: "Arachides",
    });
  });

  it("tells the page whether email is enabled", async () => {
    const { app } = setup();
    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });
    expect((await res.json()).emailEnabled).toBe(true);

    const disabled = createApp({
      ...createDeps({ db: createFakeAdminDb([PAID]), mailer: null }),
      verifyAdmin,
    });
    const off = await disabled.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });
    expect((await off.json()).emailEnabled).toBe(false);
  });

  it("confirms a payment SumUp took after the hold expired", async () => {
    const expired = buildReservation({ status: "expired" });
    const { app, sumup, mailer } = setup(
      [expired],
      20,
      createFakeSumUp("PAID"),
    );

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect(sumup.getCheckout).toHaveBeenCalledWith(CHECKOUT_ID);
    const body = await res.json();
    expect(body.rows[0]).toMatchObject({
      status: "paid",
      ticketNo: 1,
    });
    expect(body.totals).toMatchObject({ coversPaid: 2, reservations: 1 });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("re-reads every unpaid row with a checkout, and only those", async () => {
    const held = buildReservation({
      id: "a0000000-0000-4000-8000-000000000002",
      sumup_checkout_id: "chk_held",
    });
    const failed = buildReservation({
      id: "a0000000-0000-4000-8000-000000000003",
      status: "failed",
      sumup_checkout_id: "chk_failed",
    });
    const cancelled = buildReservation({
      id: "a0000000-0000-4000-8000-000000000004",
      status: "cancelled",
      sumup_checkout_id: "chk_cancelled",
    });
    const noCheckout = buildReservation({
      id: "a0000000-0000-4000-8000-000000000005",
      status: "failed",
      sumup_checkout_id: null,
    });
    const { app, sumup } = setup([PAID, held, failed, cancelled, noCheckout]);

    await app.request("/api/admin/reservations", { headers: ADMIN_HEADERS });

    expect(sumup.getCheckout).toHaveBeenCalledTimes(3);
    for (const checkoutId of ["chk_held", "chk_failed", "chk_cancelled"])
      expect(sumup.getCheckout).toHaveBeenCalledWith(checkoutId);
  });

  it("re-reads only the rows created in the last 48 hours", async () => {
    const now = new Date("2026-11-09T12:00:00Z");
    vi.setSystemTime(now);
    const hoursAgo = (hours: number) =>
      new Date(now.getTime() - hours * 60 * 60 * 1000);
    const recent = buildReservation({
      id: "a0000000-0000-4000-8000-000000000002",
      status: "expired",
      sumup_checkout_id: "chk_recent",
      created_at: hoursAgo(47.9),
    });
    const old = buildReservation({
      id: "a0000000-0000-4000-8000-000000000003",
      status: "expired",
      sumup_checkout_id: "chk_old",
      created_at: hoursAgo(48.1),
    });
    const { app, sumup } = setup([recent, old]);

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect(sumup.getCheckout).toHaveBeenCalledTimes(1);
    expect(sumup.getCheckout).toHaveBeenCalledWith("chk_recent");
    expect((await res.json()).rows).toHaveLength(2);
  });

  it("still lists the rows when a SumUp read fails", async () => {
    const sumup = createFakeSumUp();
    sumup.getCheckout.mockRejectedValue(new Error("SumUp timeout"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { app } = setup([buildReservation({ status: "expired" })], 20, sumup);

    const res = await app.request("/api/admin/reservations", {
      headers: ADMIN_HEADERS,
    });

    expect(res.status).toBe(200);
    expect((await res.json()).rows[0].status).toBe("expired");
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/admin/capacity", () => {
  it("saves the new capacity", async () => {
    const { app, db } = setup([PAID]);

    const res = await app.request(
      "/api/admin/capacity",
      post({ capacity: 18 }),
    );

    expect(res.status).toBe(200);
    expect(db.setCapacity).toHaveBeenCalledWith(18);
  });

  it("refuses a capacity below the seats already taken", async () => {
    const { app } = setup([PAID]);

    const res = await app.request("/api/admin/capacity", post({ capacity: 1 }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "CAPACITY_BELOW_TAKEN" });
  });

  it.each([[-1], [2.5], ["18"], [null]])(
    "refuses an invalid capacity %j",
    async (capacity) => {
      const { app, db } = setup();

      const res = await app.request("/api/admin/capacity", post({ capacity }));

      expect(res.status).toBe(400);
      expect(db.setCapacity).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/admin/reservations", () => {
  it("adds a paid manual reservation and returns its ticket number", async () => {
    const { app, db, mailer } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, fullName: "  Léa Martin " }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: MANUAL_ID,
      ticketNo: 9,
      email: "none",
    });
    expect(db.adminAdd).toHaveBeenCalledWith({
      fullName: "Léa Martin",
      email: null,
      covers: 1,
      vg: 0,
      paymentMethod: "liquide",
      priceCents: 4500,
    });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("takes a manual row of more than two covers", async () => {
    const { app, db } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, covers: 5, vg: 3 }),
    );

    expect(res.status).toBe(200);
    expect(db.adminAdd).toHaveBeenCalledWith(
      expect.objectContaining({ covers: 5, vg: 3 }),
    );
  });

  it("refuses a reservation when the event is full", async () => {
    const { app } = setup([PAID], 2);

    const res = await app.request(
      "/api/admin/reservations",
      post(NEW_RESERVATION),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "SOLD_OUT" });
  });

  it("does not email unless asked", async () => {
    const { app, mailer } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, email: "lea@mail.fr", sendEmail: false }),
    );

    expect((await res.json()).email).toBe("none");
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("sends the confirmation when asked, through the email claim", async () => {
    const { app, db, mailer } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, email: " Lea@Mail.fr ", sendEmail: true }),
    );

    expect(await res.json()).toEqual({
      id: MANUAL_ID,
      ticketNo: 9,
      email: "sent",
    });
    expect(db.adminAdd).toHaveBeenCalledWith(
      expect.objectContaining({ email: "lea@mail.fr" }),
    );
    expect(db.claimEmail).toHaveBeenCalledWith(MANUAL_ID);
    expect(mailer.send).toHaveBeenCalledTimes(1);
    const [mail] = mailer.send.mock.calls[0];
    expect(mail.to).toBe("lea@mail.fr");
    expect(mail.subject).toBe("Ton couvert est posé. Nº09");
    expect(mail.html).toContain(`${SITE_URL}/billet?ref=${MANUAL_ID}`);
  });

  it("keeps the reservation and reports a failed email", async () => {
    const { app, db, mailer } = setup();
    mailer.send.mockRejectedValueOnce(
      Object.assign(new Error("Invalid login lea@mail.fr"), { code: "EAUTH" }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, email: "lea@mail.fr", sendEmail: true }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: MANUAL_ID,
      ticketNo: 9,
      email: "failed",
    });
    expect(db.releaseEmail).toHaveBeenCalledWith(MANUAL_ID);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0])).not.toContain("lea@mail.fr");
  });

  it("ignores sendEmail when the mailer is disabled", async () => {
    const db = createFakeAdminDb([PAID]);
    const app = createApp({
      ...createDeps({ db, mailer: null }),
      verifyAdmin,
    });

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, email: "lea@mail.fr", sendEmail: true }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).email).toBe("none");
    expect(db.claimEmail).not.toHaveBeenCalled();
  });

  it("ignores sendEmail without an email", async () => {
    const { app, mailer } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, email: "", sendEmail: true }),
    );

    expect((await res.json()).email).toBe("none");
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it.each([
    { fullName: "L" },
    { email: "lea@" },
    { covers: 0 },
    { covers: 1.5 },
    { vg: 2 },
    { vg: -1 },
    { paymentMethod: "sumup" },
    { sendEmail: "yes" },
  ])("refuses an invalid reservation %j", async (override) => {
    const { app, db } = setup();

    const res = await app.request(
      "/api/admin/reservations",
      post({ ...NEW_RESERVATION, ...override }),
    );

    expect(res.status).toBe(400);
    expect(db.adminAdd).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/reservations/:id/cancel", () => {
  it("cancels the reservation in the status the organiser saw", async () => {
    const { app, db } = setup();

    const res = await app.request(
      `/api/admin/reservations/${RESERVATION_ID}/cancel`,
      post({ status: "paid" }),
    );

    expect(res.status).toBe(200);
    expect(db.adminCancel).toHaveBeenCalledWith(RESERVATION_ID, "paid");
  });

  it("answers 409 when the status moved since the organiser saw it", async () => {
    const { app, db } = setup();

    const res = await app.request(
      `/api/admin/reservations/${RESERVATION_ID}/cancel`,
      post({ status: "held" }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "CHANGED" });
    expect((await db.getReservation(RESERVATION_ID))?.status).toBe("paid");
  });

  it.each([[{}], [{ status: "refunded" }], [{ status: 1 }]])(
    "refuses a cancel without a known status %j",
    async (body) => {
      const { app, db } = setup();

      const res = await app.request(
        `/api/admin/reservations/${RESERVATION_ID}/cancel`,
        post(body),
      );

      expect(res.status).toBe(400);
      expect(db.adminCancel).not.toHaveBeenCalled();
    },
  );

  it.each([["a0000000-0000-4000-8000-00000000dead"], ["not-a-uuid"]])(
    "answers 404 for an unknown id %s",
    async (id) => {
      const { app, db } = setup();

      const res = await app.request(
        `/api/admin/reservations/${id}/cancel`,
        post({ status: "held" }),
      );

      expect(res.status).toBe(404);
      expect(db.adminCancel).not.toHaveBeenCalled();
    },
  );
});
