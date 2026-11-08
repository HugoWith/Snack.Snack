import { describe, expect, it } from "vitest";
import type { AdminRow } from "../../src/lib/admin-api";
import {
  canCancel,
  canCopyTicketLink,
  cancelConfirmMessage,
  needsRefundReminder,
  ticketUrl,
  visibleRows,
} from "../../src/lib/admin-rows";

const row = (overrides: Partial<AdminRow>): AdminRow => ({
  id: "0b7f6a4e-3c1d-4e8a-9f2b-5d6c7e8f9a01",
  ticketNo: 7,
  fullName: "Camille Durand",
  email: "camille@mail.fr",
  covers: 2,
  vg: 1,
  status: "paid",
  source: "online",
  paymentMethod: "sumup",
  needsRefund: false,
  paidAt: "2026-11-07T12:05:00.000Z",
  createdAt: "2026-11-07T12:00:00.000Z",
  ...overrides,
});

describe("visibleRows", () => {
  const paid = row({ id: "paid" });
  const held = row({ id: "held", status: "held" });
  const refund = row({ id: "refund", status: "cancelled", needsRefund: true });

  it("shows paid rows and every row to refund by default", () => {
    expect(visibleRows([paid, held, refund], false)).toEqual([paid, refund]);
  });

  it("shows everything on demand", () => {
    expect(visibleRows([paid, held, refund], true)).toEqual([
      paid,
      held,
      refund,
    ]);
  });
});

describe("needsRefundReminder", () => {
  it("reminds to refund only a paid online reservation", () => {
    expect(needsRefundReminder(row({}))).toBe(true);
    expect(
      needsRefundReminder(row({ source: "manual", paymentMethod: "liquide" })),
    ).toBe(false);
    expect(needsRefundReminder(row({ status: "held" }))).toBe(false);
  });
});

describe("canCancel", () => {
  it.each(["held", "paid"] as const)("offers cancel on a %s row", (status) => {
    expect(canCancel(row({ status }))).toBe(true);
  });

  it.each(["failed", "expired", "cancelled"] as const)(
    "offers no cancel on a %s row: it holds no seat",
    (status) => {
      expect(canCancel(row({ status }))).toBe(false);
    },
  );
});

describe("cancelConfirmMessage", () => {
  it("names the reservation and adds the SumUp reminder when paid online", () => {
    expect(cancelConfirmMessage(row({}))).toBe(
      "Annuler la réservation Nº07 de Camille Durand ? Ses places seront libérées.\n\nPense à rembourser dans SumUp.",
    );
    expect(
      cancelConfirmMessage(
        row({ ticketNo: null, status: "held", source: "online" }),
      ),
    ).toBe(
      "Annuler la réservation de Camille Durand ? Ses places seront libérées.",
    );
  });
});

describe("canCopyTicketLink", () => {
  it("offers the link on a paid row with a ticket, online or manual", () => {
    expect(canCopyTicketLink(row({}))).toBe(true);
    expect(
      canCopyTicketLink(row({ source: "manual", paymentMethod: "liquide" })),
    ).toBe(true);
  });

  it.each([
    ["held", { status: "held" as const, ticketNo: null }],
    ["cancelled", { status: "cancelled" as const }],
    ["to refund", { needsRefund: true, ticketNo: null }],
  ])("offers no link on a %s row", (_label, overrides) => {
    expect(canCopyTicketLink(row(overrides))).toBe(false);
  });
});

describe("ticketUrl", () => {
  it("builds the /billet link the email uses", () => {
    expect(
      ticketUrl(
        "https://snack.example",
        "0b7f6a4e-3c1d-4e8a-9f2b-5d6c7e8f9a01",
      ),
    ).toBe(
      "https://snack.example/billet?ref=0b7f6a4e-3c1d-4e8a-9f2b-5d6c7e8f9a01",
    );
  });
});
