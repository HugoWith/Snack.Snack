import { afterEach, describe, expect, it, vi } from "vitest";
import { createCheckout, getReservation } from "../../src/lib/api";

const ORDER = {
  fullName: "Camille Durand",
  email: "camille@mail.fr",
  covers: 2,
  vg: 1,
  acceptTerms: true,
};

const stubFetch = (status: number, body: string) => {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(body, { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCheckout", () => {
  it("posts the order and returns the payment url", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify({ url: "https://pay.test" }),
    );

    expect(await createCheckout(ORDER)).toEqual({
      ok: true,
      url: "https://pay.test",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkout");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(ORDER);
  });

  it.each(["SOLD_OUT", "MAX_PER_EMAIL", "PAYMENT_UNAVAILABLE", "INVALID"])(
    "returns the %s error",
    async (error) => {
      stubFetch(409, JSON.stringify({ error }));

      expect(await createCheckout(ORDER)).toEqual({ ok: false, error });
    },
  );

  it("treats an unreadable answer as the payment being unavailable", async () => {
    stubFetch(500, "Internal Server Error");

    expect(await createCheckout(ORDER)).toEqual({
      ok: false,
      error: "PAYMENT_UNAVAILABLE",
    });
  });
});

describe("getReservation", () => {
  it("reads the reservation by reference", async () => {
    const view = {
      status: "paid",
      ticketNo: 1,
      fullName: "Camille Durand",
      covers: 2,
      vg: 1,
      needsRefund: false,
    };
    const fetchMock = stubFetch(200, JSON.stringify(view));

    expect(await getReservation("a b")).toEqual(view);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/reservation?ref=a%20b");
  });

  it("returns null for an unknown reference without reading the body", async () => {
    stubFetch(404, "Not Found");

    expect(await getReservation("x")).toBeNull();
  });

  it("throws when the reservation cannot be read", async () => {
    stubFetch(502, "Bad Gateway");

    await expect(getReservation("x")).rejects.toThrow("502");
  });
});
