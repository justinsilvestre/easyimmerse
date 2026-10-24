import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTimer } from "./timer.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("createTimer", () => {
  it("calls back once the time has passed", () => {
    const calls: string[] = [];
    createTimer().restart(100, () => calls.push("called"));
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["called"]);
  });

  it("replaces the pending callback when restarted", () => {
    const calls: string[] = [];
    const timer = createTimer();
    timer.restart(100, () => calls.push("first"));
    timer.restart(100, () => calls.push("second"));
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["second"]);
  });

  it("drops the callback when cancelled", () => {
    const calls: string[] = [];
    const timer = createTimer();
    timer.restart(100, () => calls.push("called"));
    timer.cancel();
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([]);
  });

  it("is no longer pending once it has called back", () => {
    const timer = createTimer();
    timer.restart(100, () => undefined);
    vi.advanceTimersByTime(100);
    expect(timer.isPending()).toBe(false);
  });
});
