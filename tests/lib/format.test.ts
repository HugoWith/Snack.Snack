import { describe, expect, it } from "vitest";
import {
  firstName,
  formatCovers,
  formatEuros,
  formatSeatsLeft,
  formatTicketDate,
  formatTicketNo,
  ticketFileName,
} from "../../src/lib/format";

describe("formatEuros", () => {
  it("formats cents as whole euros", () => {
    expect(formatEuros(9000)).toBe("90€");
    expect(formatEuros(4500)).toBe("45€");
  });
});

describe("formatTicketNo", () => {
  it("pads the ticket number to two digits", () => {
    expect(formatTicketNo(7)).toBe("Nº07");
    expect(formatTicketNo(12)).toBe("Nº12");
  });
});

describe("ticketFileName", () => {
  it("names the PNG after the padded ticket number", () => {
    expect(ticketFileName(7)).toBe("snack-snack-billet-07.png");
  });
});

describe("formatSeatsLeft", () => {
  it("pads the seat count to two digits", () => {
    expect(formatSeatsLeft(7)).toBe("07");
    expect(formatSeatsLeft(20)).toBe("20");
  });
});

describe("formatCovers", () => {
  it("adds the vegetarian count in parentheses", () => {
    expect(formatCovers(2, 1)).toBe("2 (1 VG)");
    expect(formatCovers(2, 2)).toBe("2 (2 VG)");
  });

  it("drops the parentheses without vegetarian covers", () => {
    expect(formatCovers(2, 0)).toBe("2");
  });
});

describe("formatTicketDate", () => {
  it("reads day, month and hour from the event's local time", () => {
    expect(formatTicketDate("2026-11-22T12:00:00+01:00")).toBe("22.11 · 12H");
    expect(formatTicketDate("2026-03-05T09:30:00+01:00")).toBe("05.03 · 9H");
  });
});

describe("firstName", () => {
  it("keeps the first word of the full name", () => {
    expect(firstName("Camille Durand")).toBe("Camille");
    expect(firstName("  Jean-Luc   de la Tour ")).toBe("Jean-Luc");
    expect(firstName("Camille")).toBe("Camille");
  });
});
