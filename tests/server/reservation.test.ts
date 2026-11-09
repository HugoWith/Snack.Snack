import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/app";
import type { Reservation } from "../../server/db";
import {
  CHECKOUT_ID,
  RESERVATION_ID,
  buildReservation,
  createDeps,
  createFakeDb,
  createFakeSumUp,
} from "./helpers";

type CheckoutStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

const setup = (row: Reservation | null, checkoutStatus: CheckoutStatus) => {
  const db = createFakeDb(row ? [row] : []);
  const sumup = createFakeSumUp(checkoutStatus);
  const app = createApp(createDeps({ db, sumup }));
  const read = async () => {
    const res = await app.request(`/api/reservation?ref=${RESERVATION_ID}`);
    return { status: res.status, body: await res.json() };
  };
  return { db, sumup, app, read };
};

describe("GET /api/reservation", () => {
  it("returns the public view of a held reservation still pending at SumUp", async () => {
    const { sumup, read } = setup(buildReservation(), "PENDING");

    const { status, body } = await read();

    expect(status).toBe(200);
    expect(body).toEqual({
      status: "held",
      ticketNo: null,
      fullName: "Camille Durand",
      covers: 2,
      vg: 1,
      needsRefund: false,
      hasCheckout: true,
    });
    expect(sumup.getCheckout).toHaveBeenCalledWith(CHECKOUT_ID);
  });

  it("never returns the email", async () => {
    const { read } = setup(buildReservation(), "PAID");

    const { body } = await read();

    expect(JSON.stringify(body)).not.toContain("camille@mail.fr");
    expect(body).not.toHaveProperty("email");
  });

  it("never returns the allergies", async () => {
    const { read } = setup(
      buildReservation({ allergies: "Arachides, gluten" }),
      "PAID",
    );

    const { body } = await read();

    expect(JSON.stringify(body)).not.toContain("Arachides");
    expect(body).not.toHaveProperty("allergies");
  });

  it("confirms the payment when SumUp says PAID", async () => {
    const { db, read } = setup(buildReservation(), "PAID");

    const { body } = await read();

    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
    expect(body).toMatchObject({
      status: "paid",
      ticketNo: 1,
      needsRefund: false,
    });
  });

  it("confirms a payment that lands after the hold expired", async () => {
    const { db, read } = setup(buildReservation({ status: "expired" }), "PAID");

    const { body } = await read();

    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
    expect(body).toMatchObject({ status: "paid", ticketNo: 1 });
  });

  it("flags for refund a payment that lands after an admin cancelled the hold", async () => {
    const { db, read } = setup(
      buildReservation({ status: "cancelled", cancelled_at: new Date() }),
      "PAID",
    );

    const { body } = await read();

    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
    expect(body).toMatchObject({
      status: "cancelled",
      ticketNo: null,
      needsRefund: true,
    });
  });

  it("marks the reservation failed when SumUp says FAILED", async () => {
    const { db, read } = setup(buildReservation(), "FAILED");

    const { body } = await read();

    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "failed");
    expect(body).toMatchObject({ status: "failed" });
  });

  it("marks the reservation expired when SumUp says EXPIRED", async () => {
    const { db, read } = setup(buildReservation(), "EXPIRED");

    const { body } = await read();

    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "expired");
    expect(body).toMatchObject({ status: "expired" });
  });

  it("confirms a payment made on the hosted page after a declined attempt", async () => {
    const { db, sumup, read } = setup(buildReservation(), "FAILED");

    expect((await read()).body).toMatchObject({ status: "failed" });
    expect(db.markFailed).toHaveBeenCalledWith(RESERVATION_ID, "failed");

    sumup.getCheckout.mockResolvedValue({ status: "PAID" });
    const { body } = await read();

    expect(db.confirmPayment).toHaveBeenCalledWith(RESERVATION_ID);
    expect(body).toMatchObject({ status: "paid", ticketNo: 1 });
  });

  it("keeps asking SumUp about a failed reservation that is still declined", async () => {
    const { db, sumup, read } = setup(
      buildReservation({ status: "failed" }),
      "FAILED",
    );

    const { body } = await read();

    expect(sumup.getCheckout).toHaveBeenCalledWith(CHECKOUT_ID);
    expect(db.markFailed).not.toHaveBeenCalled();
    expect(body).toMatchObject({ status: "failed" });
  });

  it("leaves an expired reservation alone when SumUp says EXPIRED", async () => {
    const { db, sumup, read } = setup(
      buildReservation({ status: "expired" }),
      "EXPIRED",
    );

    const { body } = await read();

    expect(sumup.getCheckout).toHaveBeenCalled();
    expect(db.markFailed).not.toHaveBeenCalled();
    expect(body).toMatchObject({ status: "expired" });
  });

  it.each([
    [
      "paid",
      buildReservation({ status: "paid", ticket_no: 4, paid_at: new Date() }),
    ],
    [
      "cancelled after payment",
      buildReservation({
        status: "cancelled",
        ticket_no: 4,
        paid_at: new Date(),
        cancelled_at: new Date(),
      }),
    ],
    ["held without a checkout", buildReservation({ sumup_checkout_id: null })],
  ])("does not ask SumUp about a reservation %s", async (_label, row) => {
    const { db, sumup, read } = setup(row, "PAID");

    const { status } = await read();

    expect(status).toBe(200);
    expect(sumup.getCheckout).not.toHaveBeenCalled();
    expect(db.confirmPayment).not.toHaveBeenCalled();
  });

  it("returns the stored status when SumUp does not answer", async () => {
    const { sumup, read } = setup(buildReservation(), "PENDING");
    sumup.getCheckout.mockRejectedValue(new Error("SumUp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await read();

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "held" });
  });

  it("answers 404 for an unknown reference", async () => {
    const { read } = setup(null, "PENDING");

    const { status, body } = await read();

    expect(status).toBe(404);
    expect(body).toEqual({ error: "NOT_FOUND" });
  });

  it("answers 404 without a database read for a malformed reference", async () => {
    const { db, app } = setup(buildReservation(), "PENDING");

    const res = await app.request("/api/reservation?ref=not-a-uuid");

    expect(res.status).toBe(404);
    expect(db.getReservation).not.toHaveBeenCalled();
  });
});
