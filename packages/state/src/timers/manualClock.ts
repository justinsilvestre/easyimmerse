import type { Clock } from "./clock.ts";

/** A clock whose time moves only when a test moves it. */
export type ManualClock = Clock & {
  /**
   * Moves time forward, firing every timer that falls due in deadline order, including timers started by the ones that fire.
   * Throws a RangeError when `ms` is negative or not a number, and an Error when one call fires more timers than any test needs.
   */
  advanceBy(ms: number): void;
};

type Wait = { handle: number; deadline: number; fire: () => void };

const maxFiringsPerAdvance = 10_000;

const tooManyFirings = `advanceBy fired ${maxFiringsPerAdvance} timers in one call; a timer that keeps restarting itself never lets it finish.`;

/** Creates a manual clock at time zero with no timers. */
export function createManualClock(): ManualClock {
  let now = 0;
  let lastHandle = 0;
  let waits: readonly Wait[] = [];
  return {
    setTimeout: (fire, ms) => {
      // As on the platforms, a negative or NaN delay counts as zero.
      const delay = ms > 0 ? ms : 0;
      lastHandle += 1;
      waits = [...waits, { handle: lastHandle, deadline: now + delay, fire }];
      return lastHandle;
    },
    clearTimeout: (handle) => {
      waits = waits.filter((wait) => wait.handle !== handle);
    },
    advanceBy: (ms) => {
      if (!(ms >= 0))
        throw new RangeError(
          `advanceBy needs a duration of zero or more, not ${ms}.`,
        );
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

/** Returns the wait with the earliest deadline at or before `target`, choosing the earliest started among equal deadlines. */
function firstDue(waits: readonly Wait[], target: number): Wait | undefined {
  let first: Wait | undefined;
  for (const wait of waits) {
    if (wait.deadline > target) continue;
    if (!first || wait.deadline < first.deadline) first = wait;
  }
  return first;
}
