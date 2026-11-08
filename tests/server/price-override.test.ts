import { describe, expect, it } from "vitest";
import { parsePriceOverride } from "../../server/validation";
import { EVENT } from "../../src/event";

describe("parsePriceOverride", () => {
  it.each([undefined, ""])("keeps the event price when unset (%j)", (raw) => {
    expect(parsePriceOverride(raw, 4500)).toBe(4500);
  });

  it.each([
    ["100", 100],
    ["1", 1],
    ["4500", 4500],
  ])("reads %s as a price in cents", (raw, cents) => {
    expect(parsePriceOverride(raw, 4500)).toBe(cents);
  });

  it.each(["abc", "0", "-100", "1.5", "100.0", "1e2", " 100", "100 ", "0100"])(
    "refuses %j",
    (raw) => {
      expect(() => parsePriceOverride(raw, 4500)).toThrow(
        "PRICE_CENTS_OVERRIDE",
      );
    },
  );

  it("refuses a value too large to be an exact integer", () => {
    expect(() => parsePriceOverride("9007199254740993", 4500)).toThrow(
      "PRICE_CENTS_OVERRIDE",
    );
  });

  it("accepts the event price itself", () => {
    expect(
      parsePriceOverride(String(EVENT.priceCents), EVENT.priceCents),
    ).toBe(EVENT.priceCents);
  });

  it("refuses a price above the event price", () => {
    expect(() =>
      parsePriceOverride(String(EVENT.priceCents + 1), EVENT.priceCents),
    ).toThrow("PRICE_CENTS_OVERRIDE");
    expect(() => parsePriceOverride("2147483648", EVENT.priceCents)).toThrow(
      "PRICE_CENTS_OVERRIDE",
    );
  });
});
