import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addReservation,
  cancelReservation,
  getAdminData,
  saveCapacity,
} from "../../src/lib/admin-api";

const stubFetch = (status: number, body: unknown) => {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin api", () => {
  it("sends the session token as a bearer", async () => {
    const fetchMock = stubFetch(200, { totals: {}, rows: [] });

    await getAdminData("tok");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/reservations");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("reports a refused session", async () => {
    stubFetch(401, { error: "UNAUTHORIZED" });

    expect(await getAdminData("tok")).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
  });

  it("passes the seat errors through", async () => {
    stubFetch(409, { error: "CAPACITY_BELOW_TAKEN" });
    expect(await saveCapacity("tok", 1)).toEqual({
      ok: false,
      error: "CAPACITY_BELOW_TAKEN",
    });

    stubFetch(409, { error: "SOLD_OUT" });
    expect(
      await addReservation("tok", {
        fullName: "Léa Martin",
        email: "",
        covers: 1,
        vg: 0,
        paymentMethod: "liquide",
        sendEmail: false,
      }),
    ).toEqual({ ok: false, error: "SOLD_OUT" });
  });

  it("returns the new ticket and the email outcome", async () => {
    const fetchMock = stubFetch(200, { id: "x", ticketNo: 9, email: "failed" });

    expect(
      await addReservation("tok", {
        fullName: "Léa Martin",
        email: "lea@mail.fr",
        covers: 1,
        vg: 0,
        paymentMethod: "offert",
        sendEmail: true,
      }),
    ).toEqual({ ok: true, value: { id: "x", ticketNo: 9, email: "failed" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
  });

  it("maps an unknown reservation by its status", async () => {
    stubFetch(404, "Not Found");

    expect(await cancelReservation("tok", "x", "held")).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("cancels with the status the organiser saw", async () => {
    const fetchMock = stubFetch(200, { id: "x" });

    await cancelReservation("tok", "x", "held");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/reservations/x/cancel");
    expect(JSON.parse(String(init?.body))).toEqual({ status: "held" });
  });

  it("reports a reservation that changed since it was shown", async () => {
    stubFetch(409, { error: "CHANGED" });

    expect(await cancelReservation("tok", "x", "held")).toEqual({
      ok: false,
      error: "CHANGED",
    });
  });

  it("treats anything else as unavailable", async () => {
    stubFetch(500, null);

    expect(await saveCapacity("tok", 18)).toEqual({
      ok: false,
      error: "UNAVAILABLE",
    });
  });
});
