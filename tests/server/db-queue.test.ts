import { describe, expect, it } from "vitest";
import { createQueue } from "../../server/db";

describe("createQueue", () => {
  it("starts a task only once the previous one has settled", async () => {
    const queue = createQueue();
    const events: string[] = [];
    let finishFirst = (): void => {};

    const first = queue(async () => {
      events.push("first started");
      await new Promise<void>((resolve) => {
        finishFirst = resolve;
      });
      events.push("first done");
      return 1;
    });
    const second = queue(async () => {
      events.push("second started");
      return 2;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["first started"]);

    finishFirst();

    expect(await Promise.all([first, second])).toEqual([1, 2]);
    expect(events).toEqual(["first started", "first done", "second started"]);
  });

  it("does not hand a task the previous task's value", async () => {
    const queue = createQueue();

    void queue(async () => "first");
    const second = queue(async (previous?: unknown) => previous);

    expect(await second).toBeUndefined();
  });

  it("runs the next task after a rejected one", async () => {
    const queue = createQueue();

    const failing = queue(async () => {
      throw new Error("boom");
    });
    const next = queue(async () => "ok");

    await expect(failing).rejects.toThrow("boom");
    expect(await next).toBe("ok");
  });
});
