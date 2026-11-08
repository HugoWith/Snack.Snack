import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";
import { createDeps } from "./helpers";

describe("GET /api/seats-left", () => {
  it("returns the seats left with a short public cache", async () => {
    const app = createApp(
      createDeps({
        db: { seatsLeft: async () => ({ left: 7, capacity: 20 }) },
      }),
    );

    const res = await app.request("/api/seats-left");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ left: 7, capacity: 20 });
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=10");
  });

  it("does not cache a failure", async () => {
    const app = createApp(
      createDeps({
        db: {
          seatsLeft: async () => {
            throw new Error("connection refused");
          },
        },
      }),
    );

    const res = await app.request("/api/seats-left");

    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe(null);
  });
});
