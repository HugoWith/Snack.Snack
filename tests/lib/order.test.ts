import { describe, expect, it } from "vitest";
import {
  ORDER_COPY,
  clampCovers,
  clampVg,
  isValidFullName,
  orderTotalCents,
  validateOrder,
  type OrderInput,
} from "../../src/lib/order";

const validOrder: OrderInput = {
  fullName: "Camille Durand",
  email: "camille@mail.fr",
  covers: 2,
  vg: 1,
  acceptTerms: true,
};

describe("validateOrder", () => {
  it("returns no errors for a valid order", () => {
    expect(validateOrder(validOrder, 7)).toEqual({});
  });

  it("rejects an email without a domain extension", () => {
    const errors = validateOrder({ ...validOrder, email: "camille@mail" }, 7);
    expect(errors.email).toBe(ORDER_COPY.email);
    expect(errors.email).toBe(
      "Il manque la fin de l'adresse. Ton billet arrive par là.",
    );
  });

  it("rejects a name that is too short once trimmed", () => {
    const errors = validateOrder({ ...validOrder, fullName: " A " }, 7);
    expect(errors.fullName).toBe(ORDER_COPY.fullName);
  });

  it("counts a name in code points, like Postgres char_length", () => {
    expect(isValidFullName("😀")).toBe(false);
    expect(isValidFullName("😀😀")).toBe(true);
    expect(isValidFullName("😀".repeat(120))).toBe(true);
    expect(isValidFullName("😀".repeat(121))).toBe(false);
  });

  it("rejects a name longer than 120 characters", () => {
    const errors = validateOrder(
      { ...validOrder, fullName: "a".repeat(121) },
      7,
    );
    expect(errors.fullName).toBe(ORDER_COPY.fullName);
  });

  it("rejects unaccepted terms", () => {
    const errors = validateOrder({ ...validOrder, acceptTerms: false }, 7);
    expect(errors.terms).toBe(ORDER_COPY.terms);
  });

  it("reports the remaining seats when covers exceed them", () => {
    const errors = validateOrder({ ...validOrder, covers: 2 }, 1);
    expect(errors.covers).toBe("Il ne reste que 1 place.");
  });

  it("pluralizes the remaining seats message", () => {
    expect(ORDER_COPY.seatsLeft(2)).toBe("Il ne reste que 2 places.");
  });

  it("reports the per-person maximum when covers exceed it", () => {
    const errors = validateOrder({ ...validOrder, covers: 3 }, 7);
    expect(errors.covers).toBe("2 couverts max. par personne.");
  });

  it("prefers the per-person maximum when both limits apply", () => {
    const errors = validateOrder({ ...validOrder, covers: 3 }, 1);
    expect(errors.covers).toBe(ORDER_COPY.maxPerPerson);
  });
});

describe("orderTotalCents", () => {
  it("multiplies covers by the unit price", () => {
    expect(orderTotalCents(2)).toBe(9000);
    expect(orderTotalCents(1)).toBe(4500);
  });
});

describe("clampCovers", () => {
  it("caps covers at the per-person maximum", () => {
    expect(clampCovers(5, 7)).toBe(2);
  });

  it("caps covers at the remaining seats", () => {
    expect(clampCovers(2, 1)).toBe(1);
  });

  it("keeps at least one cover", () => {
    expect(clampCovers(0, 7)).toBe(1);
  });
});

describe("clampVg", () => {
  it("caps vegetarian covers at the number of covers", () => {
    expect(clampVg(2, 1)).toBe(1);
  });

  it("keeps at least zero", () => {
    expect(clampVg(-1, 2)).toBe(0);
  });
});
