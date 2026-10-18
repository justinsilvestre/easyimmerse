import type { AppAction } from "../app/appAction.ts";

/**
 * Starts or cancels a timer. A started timer dispatches its action once, after `ms` milliseconds.
 * Starting an id that is already pending replaces that timer; cancelling an id that is not pending does nothing.
 */
export type TimerEffect =
  | { type: "startTimer"; id: string; ms: number; action: AppAction }
  | { type: "cancelTimer"; id: string };
