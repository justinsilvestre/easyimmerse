import { describe, expect, it } from "vitest";
import { createManualClock } from "./manualClock.ts";
import { createTimerTable } from "./timerTable.ts";

describe("createTimerTable", () => {
  it("fires a timer once its time has passed", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    createTimerTable(clock).start("a", 100, () => fired.push("a"));
    clock.advanceBy(100);
    expect(fired).toEqual(["a"]);
  });

  it("does not fire a timer before its time", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    createTimerTable(clock).start("a", 100, () => fired.push("a"));
    clock.advanceBy(99);
    expect(fired).toEqual([]);
  });

  it("does not fire the timer that a start with the same id replaced", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    const timers = createTimerTable(clock);
    timers.start("a", 100, () => fired.push("first"));
    timers.start("a", 100, () => fired.push("second"));
    clock.advanceBy(100);
    expect(fired).toEqual(["second"]);
  });

  it("does not fire a cancelled timer", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    const timers = createTimerTable(clock);
    timers.start("a", 100, () => fired.push("a"));
    timers.cancel("a");
    clock.advanceBy(100);
    expect(fired).toEqual([]);
  });

  it("ignores cancelling an id that is not pending", () => {
    const timers = createTimerTable(createManualClock());
    expect(() => timers.cancel("a")).not.toThrow();
  });

  it("fires a timer at most once", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    createTimerTable(clock).start("a", 100, () => fired.push("a"));
    clock.advanceBy(100);
    clock.advanceBy(100);
    expect(fired).toEqual(["a"]);
  });

  it("starts an id again after its timer fired", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    const timers = createTimerTable(clock);
    timers.start("a", 100, () => fired.push("first"));
    clock.advanceBy(100);
    timers.start("a", 100, () => fired.push("second"));
    clock.advanceBy(100);
    expect(fired).toEqual(["first", "second"]);
  });

  it("keeps a timer that its own firing starts with the same id", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    const timers = createTimerTable(clock);
    timers.start("a", 100, () =>
      timers.start("a", 100, () => fired.push("again")),
    );
    clock.advanceBy(200);
    expect(fired).toEqual(["again"]);
  });
});
