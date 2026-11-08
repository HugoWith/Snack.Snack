import { describe, expect, it } from "vitest";
import type { ReservationView } from "../../src/lib/api";
import {
  MAX_POLL_ATTEMPTS,
  nextMerciState,
  nextPollState,
  pickBilletState,
} from "../../src/lib/reservation-status";

const PAID: ReservationView = {
  status: "paid",
  ticketNo: 7,
  fullName: "Camille Durand",
  covers: 2,
  vg: 1,
  needsRefund: false,
  hasCheckout: true,
};

const TICKET = { ticketNo: 7, fullName: "Camille Durand", covers: 2, vg: 1 };

describe("nextPollState", () => {
  it("shows the ticket once paid", () => {
    expect(nextPollState({ attempts: 1 }, "paid")).toBe("show");
  });

  it("keeps polling a held reservation", () => {
    expect(nextPollState({ attempts: 1 }, "held")).toBe("poll");
  });

  it("polls a held reservation up to the 29th attempt", () => {
    expect(nextPollState({ attempts: 29 }, "held")).toBe("poll");
  });

  it("times out a held reservation at the 30th attempt", () => {
    expect(MAX_POLL_ATTEMPTS).toBe(30);
    expect(nextPollState({ attempts: 30 }, "held")).toBe("timeout");
    expect(nextPollState({ attempts: 31 }, "held")).toBe("timeout");
  });

  it.each(["failed", "expired", "cancelled"] as const)(
    "stops on a %s reservation",
    (status) => {
      expect(nextPollState({ attempts: 1 }, status)).toBe("failed");
    },
  );
});

describe("nextMerciState", () => {
  it("shows the ticket of a paid reservation", () => {
    expect(nextMerciState({ attempts: 1 }, PAID)).toEqual({
      state: "show",
      ticket: TICKET,
    });
  });

  it.each(["paid", "cancelled", "held", "failed"] as const)(
    "shows the refund message for a %s reservation flagged for refund",
    (status) => {
      expect(
        nextMerciState({ attempts: 1 }, { ...PAID, status, needsRefund: true }),
      ).toEqual({ state: "refund" });
    },
  );

  it("shows the refund message for a paid reservation without a ticket", () => {
    expect(
      nextMerciState({ attempts: 1 }, { ...PAID, ticketNo: null }),
    ).toEqual({ state: "refund" });
  });

  it("follows nextPollState for an unpaid reservation", () => {
    const held = { ...PAID, status: "held", ticketNo: null } as const;

    expect(nextMerciState({ attempts: 29 }, held)).toEqual({ state: "poll" });
    expect(nextMerciState({ attempts: 30 }, held)).toEqual({
      state: "timeout",
    });
    expect(
      nextMerciState(
        { attempts: 1 },
        { ...held, status: "expired", hasCheckout: false },
      ),
    ).toEqual({ state: "failed" });
  });

  it("keeps polling a declined checkout that can still be paid, then fails", () => {
    const failed = {
      ...PAID,
      status: "failed",
      ticketNo: null,
      hasCheckout: true,
    } as const;

    expect(nextMerciState({ attempts: 1 }, failed)).toEqual({ state: "poll" });
    expect(nextMerciState({ attempts: 29 }, failed)).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 30 }, failed)).toEqual({
      state: "failed",
    });
  });

  it("keeps polling a released hold whose checkout can still be paid, then fails", () => {
    const expired = {
      ...PAID,
      status: "expired",
      ticketNo: null,
      hasCheckout: true,
    } as const;

    expect(nextMerciState({ attempts: 1 }, expired)).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 29 }, expired)).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 30 }, expired)).toEqual({
      state: "failed",
    });
  });

  it("keeps polling a cancelled hold whose checkout can still be paid, then fails", () => {
    const cancelled = {
      ...PAID,
      status: "cancelled",
      ticketNo: null,
      hasCheckout: true,
    } as const;

    expect(nextMerciState({ attempts: 1 }, cancelled)).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 29 }, cancelled)).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 30 }, cancelled)).toEqual({
      state: "failed",
    });
  });

  it("fails at once on a paid reservation cancelled by an organiser", () => {
    expect(
      nextMerciState(
        { attempts: 1 },
        { ...PAID, status: "cancelled", hasCheckout: true },
      ),
    ).toEqual({ state: "failed" });
  });

  it("fails at once on a cancelled row that never reached SumUp", () => {
    expect(
      nextMerciState(
        { attempts: 1 },
        { ...PAID, status: "cancelled", ticketNo: null, hasCheckout: false },
      ),
    ).toEqual({ state: "failed" });
  });

  it("fails at once on an expired row that never reached SumUp", () => {
    expect(
      nextMerciState(
        { attempts: 1 },
        { ...PAID, status: "expired", ticketNo: null, hasCheckout: false },
      ),
    ).toEqual({ state: "failed" });
  });

  it("fails at once on a failed row that never reached SumUp", () => {
    expect(
      nextMerciState(
        { attempts: 1 },
        { ...PAID, status: "failed", ticketNo: null, hasCheckout: false },
      ),
    ).toEqual({ state: "failed" });
  });

  it("fails on an unknown reference", () => {
    expect(nextMerciState({ attempts: 1 }, "not-found")).toEqual({
      state: "failed",
    });
  });

  it("keeps polling while the API is unreachable, then times out", () => {
    expect(nextMerciState({ attempts: 29 }, "unreachable")).toEqual({
      state: "poll",
    });
    expect(nextMerciState({ attempts: 30 }, "unreachable")).toEqual({
      state: "timeout",
    });
  });
});

describe("pickBilletState", () => {
  it("shows the ticket of a paid reservation", () => {
    expect(pickBilletState(PAID)).toEqual({ state: "show", ticket: TICKET });
  });

  it("shows the refund message for a cancelled reservation flagged for refund", () => {
    expect(
      pickBilletState({ ...PAID, status: "cancelled", needsRefund: true }),
    ).toEqual({ state: "refund" });
  });

  it.each(["held", "failed", "expired", "cancelled"] as const)(
    "fails without polling on a %s reservation",
    (status) => {
      expect(pickBilletState({ ...PAID, status, ticketNo: null })).toEqual({
        state: "failed",
      });
    },
  );

  it("fails on an unknown reference", () => {
    expect(pickBilletState("not-found")).toEqual({ state: "failed" });
  });

  it("reports an unreachable API", () => {
    expect(pickBilletState("unreachable")).toEqual({ state: "unreachable" });
  });
});
