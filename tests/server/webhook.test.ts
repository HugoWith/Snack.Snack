import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/app";
import {
  CHECKOUT_ID,
  RESERVATION_ID,
  buildReservation,
  createDeps,
  createFakeDb,
  createFakeSumUp,
} from "./helpers";

const postWebhook = (app: ReturnType<typeof createApp>, body: unknown) =>
  app.request("/api/webhook/sumup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const STATUS_CHANGED = {
  event_type: "CHECKOUT_STATUS_CHANGED",
  id: CHECKOUT_ID,
};

describe("POST /api/webhook/sumup", () => {
  it("ignores other event types", async () => {
    const sumup = createFakeSumUp("PAID");
    const app = createApp(createDeps({ db: createFakeDb(), sumup }));

    const res = await postWebhook(app, {
      event_type: "SOMETHING_ELSE",
      id: CHECKOUT_ID,
    });

    expect(res.status).toBe(200);
    expect(sumup.getCheckout).not.toHaveBeenCalled();
  });

  it("re-reads the checkout and confirms the payment once when PAID", async () => {
    const db = createFakeDb([buildReservation()]);
    const sumup = createFakeSumUp("PAID");
    const app = createApp(createDeps({ db, sumup }));

    const res = await postWebhook(app, STATUS_CHANGED);

    expect(res.status).toBe(200);
    expect(db.getByCheckoutId).toHaveBeenCalledWith(CHECKOUT_ID);
    expect(sumup.getCheckout).toHaveBeenCalledWith(CHECKOUT_ID);
    expect(db.confirmPayment).toHaveBeenCalledTimes(1);
    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
  });

  it("answers 5xx when the sync fails so SumUp retries", async () => {
    const db = createFakeDb([buildReservation()]);
    const sumup = createFakeSumUp("PAID");
    sumup.getCheckout.mockRejectedValue(new Error("SumUp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(createDeps({ db, sumup }));

    const res = await postWebhook(app, STATUS_CHANGED);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(db.confirmPayment).not.toHaveBeenCalled();
  });

  it("answers 5xx when the database fails so SumUp retries", async () => {
    const db = createFakeDb([buildReservation()]);
    db.getByCheckoutId.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(createDeps({ db }));

    const res = await postWebhook(app, STATUS_CHANGED);

    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("confirms a payment made after a declined attempt", async () => {
    const db = createFakeDb([buildReservation()]);
    const sumup = createFakeSumUp("FAILED");
    const app = createApp(createDeps({ db, sumup }));

    await postWebhook(app, STATUS_CHANGED);
    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "failed");

    sumup.getCheckout.mockResolvedValue({ status: "PAID" });
    const res = await postWebhook(app, STATUS_CHANGED);

    expect(res.status).toBe(200);
    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
    expect(await db.getReservation(RESERVATION_ID)).toMatchObject({
      status: "paid",
      ticket_no: 1,
    });
  });

  it("ignores a checkout it does not know", async () => {
    const sumup = createFakeSumUp("PAID");
    const app = createApp(createDeps({ db: createFakeDb(), sumup }));

    const res = await postWebhook(app, STATUS_CHANGED);

    expect(res.status).toBe(200);
    expect(sumup.getCheckout).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    const app = createApp(createDeps({ db: createFakeDb() }));

    const res = await postWebhook(app, "{not json");

    expect(res.status).toBe(400);
  });
});
