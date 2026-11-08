import { describe, expect, it } from "vitest";
import { checkoutErrorMessage } from "../../src/pages/billetterie/useOrderForm";

describe("checkoutErrorMessage", () => {
  it.each([
    ["SOLD_OUT", "C'est complet, désolé."],
    ["MAX_PER_EMAIL", "2 couverts max. par personne."],
    [
      "PAYMENT_UNAVAILABLE",
      "Le paiement ne répond pas. Réessaie dans une minute.",
    ],
    ["INVALID", "Le paiement ne répond pas. Réessaie dans une minute."],
  ] as const)("explains %s", (error, message) => {
    expect(checkoutErrorMessage(error)).toBe(message);
  });
});
