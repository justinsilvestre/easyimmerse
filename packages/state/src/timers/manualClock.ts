import type { Clock } from "./clock.ts";

/** A clock whose time moves only when a test moves it. */
export type ManualClock = Clock & {
  /**
   * Moves time forward, firing every timer that falls due in deadline order, including timers started by the ones that fire.
   * Throws when one call fires more timers than any test needs, which happens when timers restart themselves without waiting.
   */
  advanceBy(ms: number): void;
};

type Wait = { handle: number; deadline: number; fire: () => void };

const maxFiringsPerAdvance = 10_000;

/** Creates a manual clock at time zero with no timers. */
export function createManualClock(): ManualClock {
  let now = 0;
  let lastHandle = 0;
  let waits: readonly Wait[] = [];
  return {
    setTimeout: (fire, ms) => {
      lastHandle += 1;
      waits = [...waits, { handle: lastHandle, deadline: now + ms, fire }];
      return lastHandle;
    },
    clearTimeout: (handle) => {
      waits = waits.filter((wait) => wait.handle !== handle);
    },
    advanceBy: (ms) => {
      const target = now + ms;
      for (let firings = 0; ; firings += 1) {
        const due = firstDue(waits, target);
        if (!due) break;
        if (firings === maxFiringsPerAdvance) throw new Error(tooManyFirings);
        waits = waits.filter((wait) => wait !== due);
        now = due.deadline;
        due.fire();
      }
      now = target;
    },
  };
}

const tooManyFirings = `A single advanceBy fired ${maxFiringsPerAdvance} timers. Timers that restart themselves with no delay never let it finish.`;

/** Returns the wait with the earliest deadline at or before `target`, choosing the earliest started among equal deadlines. */
function firstDue(waits: readonly Wait[], target: number): Wait | undefined {
  let first: Wait | undefined;
  for (const wait of waits) {
    if (wait.deadline > target) continue;
    if (!first || wait.deadline < first.deadline) first = wait;
  }
  return first;
}
