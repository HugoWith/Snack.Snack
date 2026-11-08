import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenReady } from "../../src/lib/when-ready";

const never = (): Promise<never> => new Promise(() => {});

const track = (promise: Promise<void>): { isDone: () => boolean } => {
  let isDone = false;
  promise.then(() => {
    isDone = true;
  });
  return { isDone: () => isDone };
};

describe("whenReady", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves once every task has settled, before the timeout", async () => {
    let finish: () => void = () => {};
    const slow = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const ready = track(whenReady([Promise.resolve(), slow], 1000));

    await vi.advanceTimersByTimeAsync(200);
    expect(ready.isDone()).toBe(false);

    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(ready.isDone()).toBe(true);
  });

  it("treats a failed task as settled", async () => {
    const ready = track(
      whenReady([Promise.reject(new Error("decode failed"))], 1000),
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(ready.isDone()).toBe(true);
  });

  it("gives up waiting at the timeout when a task never settles", async () => {
    const ready = track(whenReady([Promise.resolve(), never()], 1000));

    await vi.advanceTimersByTimeAsync(999);
    expect(ready.isDone()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(ready.isDone()).toBe(true);
  });
});
