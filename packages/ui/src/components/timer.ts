/** One pending callback at a time: starting it again replaces the one before. */
export type Timer = {
  restart(ms: number, callback: () => void): void;
  cancel(): void;
  isPending(): boolean;
};

export function createTimer(): Timer {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(pending);
    pending = undefined;
  };
  return {
    restart: (ms, callback) => {
      cancel();
      pending = setTimeout(() => {
        pending = undefined;
        callback();
      }, ms);
    },
    cancel,
    isPending: () => pending !== undefined,
  };
}
