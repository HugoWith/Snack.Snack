import { describe, expect, it } from "vitest";
import { pickVisibleErrors } from "../../src/pages/billetterie/useOrderForm";

const ERRORS = { fullName: "a", email: "b", terms: "c" };

describe("pickVisibleErrors", () => {
  it("hides every error before a field is touched or the form submitted", () => {
    expect(pickVisibleErrors(ERRORS, {}, false)).toEqual({});
  });

  it("shows only touched fields before submit", () => {
    expect(pickVisibleErrors(ERRORS, { email: true }, false)).toEqual({
      email: "b",
    });
  });

  it("shows every current error after submit", () => {
    expect(pickVisibleErrors(ERRORS, {}, true)).toEqual(ERRORS);
  });
});
