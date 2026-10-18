import { describe, expect, it } from "vitest";
import { createManualClock } from "./manualClock.ts";

describe("createManualClock", () => {
  it("fires a timer once time reaches its deadline", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("a"), 100);
    clock.advanceBy(100);
    expect(fired).toEqual(["a"]);
  });

  it("does not fire a timer before its deadline", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("a"), 100);
    clock.advanceBy(99);
    expect(fired).toEqual([]);
  });

  it("adds successive advances together", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("a"), 100);
    clock.advanceBy(60);
    clock.advanceBy(40);
    expect(fired).toEqual(["a"]);
  });

  it("fires due timers in deadline order", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("late"), 200);
    clock.setTimeout(() => fired.push("early"), 100);
    clock.advanceBy(300);
    expect(fired).toEqual(["early", "late"]);
  });

  it("fires timers with one deadline in the order they started", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("first"), 100);
    clock.setTimeout(() => fired.push("second"), 100);
    clock.advanceBy(100);
    expect(fired).toEqual(["first", "second"]);
  });

  it("does not fire a cleared timer", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    const handle = clock.setTimeout(() => fired.push("a"), 100);
    clock.clearTimeout(handle);
    clock.advanceBy(100);
    expect(fired).toEqual([]);
  });

  it("fires a timer that a firing timer starts when it falls due within the same advance", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(
      () => clock.setTimeout(() => fired.push("second"), 100),
      100,
    );
    clock.advanceBy(200);
    expect(fired).toEqual(["second"]);
  });

  it("leaves a timer that a firing timer starts pending when it falls due after the advance", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(
      () => clock.setTimeout(() => fired.push("second"), 100),
      100,
    );
    clock.advanceBy(199);
    expect(fired).toEqual([]);
  });

  it("throws instead of firing a timer that restarts itself without end", () => {
    const clock = createManualClock();
    const restart = () => {
      clock.setTimeout(restart, 0);
    };
    clock.setTimeout(restart, 0);
    expect(() => clock.advanceBy(1)).toThrow(/keeps restarting itself/);
  });

  it("treats a negative delay as zero", () => {
    const clock = createManualClock();
    const fired: string[] = [];
    clock.setTimeout(() => fired.push("zero"), 0);
    clock.setTimeout(() => fired.push("negative"), -5);
    clock.advanceBy(0);
    expect(fired).toEqual(["zero", "negative"]);
  });

  it("throws a RangeError when asked to move time backwards", () => {
    const clock = createManualClock();
    expect(() => clock.advanceBy(-1)).toThrow(RangeError);
  });
});
