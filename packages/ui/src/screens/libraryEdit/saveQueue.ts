/** Runs tasks that share a key one after another, each once the one before it settles, and tasks of other keys alongside. */
export function createSaveQueue() {
  const tails = new Map<number, Promise<unknown>>();
  return {
    run<T>(key: number, task: () => Promise<T>): Promise<T> {
      const before = tails.get(key) ?? Promise.resolve();
      const next = before.catch(() => undefined).then(task);
      tails.set(key, next);
      return next;
    },
  };
}
