import type { Clock } from "./clock.ts";

/** The timers a store has started and that have neither fired nor been cancelled, by id. */
export type TimerTable = {
  /** Calls `fire` after `ms` milliseconds, replacing the pending timer with the same id, if any. */
  start(id: string, ms: number, fire: () => void): void;
  /** Cancels the pending timer with this id, and does nothing when there is none. */
  cancel(id: string): void;
};

/** Creates an empty timer table that waits through the given clock. */
export function createTimerTable(clock: Clock): TimerTable {
  const handles = new Map<string, unknown>();
  const cancel = (id: string) => {
    if (!handles.has(id)) return;
    clock.clearTimeout(handles.get(id));
    handles.delete(id);
  };
  const start = (id: string, ms: number, fire: () => void) => {
    cancel(id);
    const handle = clock.setTimeout(() => {
      handles.delete(id);
      fire();
    }, ms);
    handles.set(id, handle);
  };
  return { start, cancel };
}
