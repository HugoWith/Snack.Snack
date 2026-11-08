import { describe, expect, it } from "vitest";
import { pickSeatsView } from "../../src/pages/billetterie/useSeatsLeft";
import { EVENT } from "../../src/event";

describe("pickSeatsView", () => {
  it("shows nothing while loading", () => {
    expect(pickSeatsView({ status: "loading" })).toEqual({
      view: "loading",
      counter: null,
      seatsLeft: 0,
    });
  });

  it("shows the form with the counter when seats are left", () => {
    const seats = { left: 7, capacity: 20 };

    expect(pickSeatsView({ status: "ready", seats })).toEqual({
      view: "form",
      counter: seats,
      seatsLeft: 7,
    });
  });

  it("shows the sold-out view with the counter at zero", () => {
    const seats = { left: 0, capacity: 20 };

    expect(pickSeatsView({ status: "ready", seats })).toEqual({
      view: "soldOut",
      counter: seats,
      seatsLeft: 0,
    });
  });

  it("keeps the form but hides the counter when loading failed", () => {
    expect(pickSeatsView({ status: "failed" })).toEqual({
      view: "form",
      counter: null,
      seatsLeft: EVENT.maxPerEmail,
    });
  });
});
