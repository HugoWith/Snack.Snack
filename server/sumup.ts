export type CheckoutStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export type CreateCheckoutInput = {
  amountCents: number;
  reference: string;
  description: string;
  redirectUrl: string;
  returnUrl: string;
};

export type SumUp = {
  createCheckout: (
    input: CreateCheckoutInput,
  ) => Promise<{ id: string; hostedCheckoutUrl: string }>;
  getCheckout: (id: string) => Promise<{ status: CheckoutStatus }>;
};

export const createSumUp = ({
  apiKey,
  merchantCode,
  timeoutMs = SUMUP_TIMEOUT_MS,
}: {
  apiKey: string;
  merchantCode: string;
  timeoutMs?: number;
}): SumUp => {
  const request = async (
    path: string,
    init?: RequestInit,
  ): Promise<unknown> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok)
      throw new Error(
        `SumUp ${init?.method ?? "GET"} ${path} failed: ${res.status}`,
      );
    return res.json();
  };

  return {
    createCheckout: async ({
      amountCents,
      reference,
      description,
      redirectUrl,
      returnUrl,
    }) => {
      const body = await request("/v0.1/checkouts", {
        method: "POST",
        body: JSON.stringify({
          amount: amountCents / 100,
          currency: "EUR",
          checkout_reference: reference,
          merchant_code: merchantCode,
          description,
          redirect_url: redirectUrl,
          return_url: returnUrl,
          hosted_checkout: { enabled: true },
        }),
      });
      if (
        !isRecord(body) ||
        typeof body.id !== "string" ||
        typeof body.hosted_checkout_url !== "string"
      )
        throw new Error("SumUp checkout has no id or hosted_checkout_url");
      return { id: body.id, hostedCheckoutUrl: body.hosted_checkout_url };
    },

    getCheckout: async (id) => {
      const body = await request(`/v0.1/checkouts/${encodeURIComponent(id)}`);
      if (!isRecord(body) || !isCheckoutStatus(body.status))
        throw new Error("SumUp checkout has an unknown status");
      return { status: body.status };
    },
  };
};

// One SumUp call (2 s) plus a stalled SMTP send (6 s socket timeout) and the
// SQL work must fit in Netlify's ~10 s synchronous function limit, with room
// to spare when both are slow, so a hang throws and the caller's failure path
// (markFailed, 5xx) still runs.
export const SUMUP_TIMEOUT_MS = 2000;

const API_BASE_URL = "https://api.sumup.com";

const CHECKOUT_STATUSES: readonly unknown[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
] satisfies CheckoutStatus[];

const isCheckoutStatus = (value: unknown): value is CheckoutStatus =>
  CHECKOUT_STATUSES.includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
