import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/app";
import { SeatError } from "../../server/db";
import { createSumUp } from "../../server/sumup";
import { parseCheckoutBody } from "../../server/validation";
import {
  CHECKOUT_ID,
  RESERVATION_ID,
  SITE_URL,
  createDeps,
  createFakeDb,
  createFakeSumUp,
  stubHangingFetch,
} from "./helpers";

const VALID_BODY = {
  fullName: "  Camille Durand ",
  email: " Camille@Mail.FR ",
  covers: 2,
  vg: 1,
  acceptTerms: true,
};

const postCheckout = (app: ReturnType<typeof createApp>, body: unknown) =>
  app.request("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/checkout", () => {
  it("holds the seats, creates the SumUp checkout and returns its url", async () => {
    const db = createFakeDb();
    const sumup = createFakeSumUp();
    const app = createApp(createDeps({ db, sumup }));

    const res = await postCheckout(app, VALID_BODY);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.sumup.com/pay/chk_123",
    });
    expect(db.holdSeats).toHaveBeenCalledWith({
      fullName: "Camille Durand",
      email: "camille@mail.fr",
      allergies: null,
      covers: 2,
      vg: 1,
      priceCents: 4500,
    });
    expect(sumup.createCheckout).toHaveBeenCalledWith({
      amountCents: 9000,
      reference: RESERVATION_ID,
      description: "Snack Snack #1 — 2 couverts",
      redirectUrl: `${SITE_URL}/merci?ref=${RESERVATION_ID}`,
      returnUrl: `${SITE_URL}/api/webhook/sumup`,
    });
    expect(db.attachCheckout).toHaveBeenCalledWith(RESERVATION_ID, CHECKOUT_ID);
  });

  it("uses the singular for one cover", async () => {
    const sumup = createFakeSumUp();
    const app = createApp(createDeps({ db: createFakeDb(), sumup }));

    await postCheckout(app, { ...VALID_BODY, covers: 1, vg: 0 });

    expect(sumup.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 4500,
        description: "Snack Snack #1 — 1 couvert",
      }),
    );
  });

  it("charges the overridden price", async () => {
    const db = createFakeDb();
    const sumup = createFakeSumUp();
    const app = createApp(createDeps({ db, sumup, priceCents: 100 }));

    await postCheckout(app, VALID_BODY);

    expect(sumup.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 200 }),
    );
    expect(db.holdSeats).toHaveBeenCalledWith(
      expect.objectContaining({ priceCents: 100 }),
    );
  });

  it("passes the declared allergies to hold_seats", async () => {
    const db = createFakeDb();
    const app = createApp(createDeps({ db }));

    await postCheckout(app, { ...VALID_BODY, allergies: "  Arachides, gluten " });

    expect(db.holdSeats).toHaveBeenCalledWith(
      expect.objectContaining({ allergies: "Arachides, gluten" }),
    );
  });

  it.each([
    ["absent", undefined],
    ["empty", ""],
  ])("stores null when allergies are %s", async (_label, allergies) => {
    const db = createFakeDb();
    const app = createApp(createDeps({ db }));

    const res = await postCheckout(app, { ...VALID_BODY, allergies });

    expect(res.status).toBe(200);
    expect(db.holdSeats).toHaveBeenCalledWith(
      expect.objectContaining({ allergies: null }),
    );
  });

  it("refuses allergies longer than 200 characters", async () => {
    const db = createFakeDb();
    const app = createApp(createDeps({ db }));

    const res = await postCheckout(app, {
      ...VALID_BODY,
      allergies: "a".repeat(201),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
    expect(db.holdSeats).not.toHaveBeenCalled();
  });

  it("refuses allergies that are not a string", async () => {
    const app = createApp(createDeps({ db: createFakeDb() }));

    const res = await postCheckout(app, { ...VALID_BODY, allergies: 42 });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it("refuses an order whose terms are not accepted", async () => {
    const db = createFakeDb();
    const app = createApp(createDeps({ db }));

    const res = await postCheckout(app, { ...VALID_BODY, acceptTerms: false });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
    expect(db.holdSeats).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    const app = createApp(createDeps({ db: createFakeDb() }));

    const res = await postCheckout(app, "{not json");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it.each(["SOLD_OUT", "MAX_PER_EMAIL"] as const)(
    "answers 409 %s when the seats cannot be held",
    async (code) => {
      const db = createFakeDb();
      db.holdSeats.mockRejectedValue(new SeatError(code));
      const sumup = createFakeSumUp();
      const app = createApp(createDeps({ db, sumup }));

      const res = await postCheckout(app, VALID_BODY);

      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: code });
      expect(sumup.createCheckout).not.toHaveBeenCalled();
    },
  );

  it("releases the seats and answers 502 when SumUp fails", async () => {
    const db = createFakeDb();
    const sumup = createFakeSumUp();
    sumup.createCheckout.mockRejectedValue(new Error("SumUp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(createDeps({ db, sumup }));

    const res = await postCheckout(app, VALID_BODY);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "PAYMENT_UNAVAILABLE" });
    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "failed");
    expect(db.attachCheckout).not.toHaveBeenCalled();
  });

  it("releases the seats and answers 502 when SumUp never answers", async () => {
    stubHangingFetch();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = createFakeDb();
    const sumup = createSumUp({
      apiKey: "test-key",
      merchantCode: "MTEST123",
      timeoutMs: 20,
    });
    const app = createApp(createDeps({ db, sumup }));

    const res = await postCheckout(app, VALID_BODY);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "PAYMENT_UNAVAILABLE" });
    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "failed");
    expect(db.attachCheckout).not.toHaveBeenCalled();
  });
});

describe("parseCheckoutBody", () => {
  it("trims the name, email and allergies and lowercases the email", () => {
    expect(
      parseCheckoutBody({ ...VALID_BODY, allergies: "  Arachides " }),
    ).toEqual({
      ok: true,
      value: {
        fullName: "Camille Durand",
        email: "camille@mail.fr",
        allergies: "Arachides",
        covers: 2,
        vg: 1,
        acceptTerms: true,
      },
    });
  });

  it("defaults absent or null allergies to an empty string", () => {
    for (const allergies of [undefined, null]) {
      expect(parseCheckoutBody({ ...VALID_BODY, allergies })).toEqual({
        ok: true,
        value: expect.objectContaining({ allergies: "" }),
      });
    }
  });

  it.each([
    ["no body", null],
    ["an array", [VALID_BODY]],
    ["a missing name", { ...VALID_BODY, fullName: undefined }],
    ["a one-letter name", { ...VALID_BODY, fullName: " C " }],
    ["a broken email", { ...VALID_BODY, email: "camille@mail" }],
    ["allergies as a number", { ...VALID_BODY, allergies: 42 }],
    ["too long allergies", { ...VALID_BODY, allergies: "a".repeat(201) }],
    ["covers as a string", { ...VALID_BODY, covers: "2" }],
    ["zero covers", { ...VALID_BODY, covers: 0, vg: 0 }],
    ["three covers", { ...VALID_BODY, covers: 3 }],
    ["fractional covers", { ...VALID_BODY, covers: 1.5 }],
    ["more VG than covers", { ...VALID_BODY, vg: 3 }],
    ["negative VG", { ...VALID_BODY, vg: -1 }],
    ["terms missing", { ...VALID_BODY, acceptTerms: undefined }],
    ["terms as a string", { ...VALID_BODY, acceptTerms: "true" }],
  ])("rejects %s", (_label, body) => {
    expect(parseCheckoutBody(body)).toEqual({ ok: false });
  });
});
