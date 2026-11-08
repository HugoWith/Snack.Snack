import { afterEach, describe, expect, it, vi } from "vitest";
import { SUMUP_TIMEOUT_MS, createSumUp } from "../../server/sumup";
import { stubHangingFetch } from "./helpers";

const sumup = createSumUp({ apiKey: "test-key", merchantCode: "MTEST123" });

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
  vi.restoreAllMocks();
});

describe("createSumUp().createCheckout", () => {
  it("creates a hosted checkout in euros", async () => {
    const fetchMock = stubFetch(201, {
      id: "chk_1",
      status: "PENDING",
      hosted_checkout_url: "https://checkout.sumup.com/pay/chk_1",
    });

    const checkout = await sumup.createCheckout({
      amountCents: 9000,
      reference: "res-1",
      description: "Snack Snack #1 — 2 couverts",
      redirectUrl: "https://site.test/merci?ref=res-1",
      returnUrl: "https://site.test/api/webhook/sumup",
    });

    expect(checkout).toEqual({
      id: "chk_1",
      hostedCheckoutUrl: "https://checkout.sumup.com/pay/chk_1",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sumup.com/v0.1/checkouts");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer test-key",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      amount: 90,
      currency: "EUR",
      checkout_reference: "res-1",
      merchant_code: "MTEST123",
      description: "Snack Snack #1 — 2 couverts",
      redirect_url: "https://site.test/merci?ref=res-1",
      return_url: "https://site.test/api/webhook/sumup",
      hosted_checkout: { enabled: true },
    });
  });

  it("throws when SumUp refuses the checkout", async () => {
    stubFetch(400, { error_code: "INVALID" });

    await expect(
      sumup.createCheckout({
        amountCents: 9000,
        reference: "res-1",
        description: "d",
        redirectUrl: "https://site.test/merci",
        returnUrl: "https://site.test/api/webhook/sumup",
      }),
    ).rejects.toThrow("400");
  });

  it("throws when the response has no hosted checkout url", async () => {
    stubFetch(201, { id: "chk_1", status: "PENDING" });

    await expect(
      sumup.createCheckout({
        amountCents: 9000,
        reference: "res-1",
        description: "d",
        redirectUrl: "https://site.test/merci",
        returnUrl: "https://site.test/api/webhook/sumup",
      }),
    ).rejects.toThrow();
  });
});

describe("createSumUp().getCheckout", () => {
  it.each(["PENDING", "PAID", "FAILED", "EXPIRED"])(
    "reads the %s status",
    async (status) => {
      const fetchMock = stubFetch(200, { id: "chk_1", status });

      expect(await sumup.getCheckout("chk_1")).toEqual({ status });
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.sumup.com/v0.1/checkouts/chk_1",
      );
    },
  );

  it("throws on an unknown status", async () => {
    stubFetch(200, { id: "chk_1", status: "SOMETHING" });

    await expect(sumup.getCheckout("chk_1")).rejects.toThrow();
  });

  it("throws when SumUp does not answer 200", async () => {
    stubFetch(404, { error_code: "NOT_FOUND" });

    await expect(sumup.getCheckout("chk_1")).rejects.toThrow("404");
  });
});

describe("createSumUp() timeout", () => {
  it("gives up after 2 s by default", () => {
    expect(SUMUP_TIMEOUT_MS).toBe(2000);
  });

  it("bounds a call made without timeoutMs by the default", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = stubFetch(200, { id: "chk_1", status: "PAID" });

    await sumup.getCheckout("chk_1");

    expect(timeout).toHaveBeenCalledExactlyOnceWith(SUMUP_TIMEOUT_MS);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(
      timeout.mock.results[0].value,
    );
  });

  it("throws when SumUp never answers", async () => {
    const fetchMock = stubHangingFetch();
    const slowSumUp = createSumUp({
      apiKey: "test-key",
      merchantCode: "MTEST123",
      timeoutMs: 20,
    });

    await expect(slowSumUp.getCheckout("chk_1")).rejects.toThrow();
    await expect(
      slowSumUp.createCheckout({
        amountCents: 4500,
        reference: "res-1",
        description: "d",
        redirectUrl: "https://site.test/merci",
        returnUrl: "https://site.test/api/webhook/sumup",
      }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
