// Resolves when every task has settled, failed ones included, or when the
// timeout runs out, whichever comes first. Never rejects.
export const whenReady = (
  tasks: Promise<unknown>[],
  timeoutMs: number,
): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    Promise.allSettled(tasks).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
