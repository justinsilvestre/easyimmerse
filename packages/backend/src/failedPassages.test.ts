import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasFailedLately, rememberFailure } from "./failedPassages.ts";

const passage = { language: "ja", text: "猫が好き" };
const minuteMs = 60_000;

describe("failedPassages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports a passage whose batch failed a moment ago", () => {
    const store = {};
    rememberFailure(store, [passage]);
    expect(hasFailedLately(store, passage)).toBe(true);
  });

  it("forgets a failure after five minutes", () => {
    const store = {};
    rememberFailure(store, [passage]);
    vi.advanceTimersByTime(5 * minuteMs);
    expect(hasFailedLately(store, passage)).toBe(false);
  });

  it("keeps the failures of each store apart", () => {
    rememberFailure({}, [passage]);
    expect(hasFailedLately({}, passage)).toBe(false);
  });

  it("drops an expired failure when it remembers another, even if the clock is turned back", () => {
    const store = {};
    rememberFailure(store, [passage]);
    vi.advanceTimersByTime(5 * minuteMs);
    rememberFailure(store, [{ language: "ja", text: "犬" }]);
    vi.setSystemTime(Date.now() - 5 * minuteMs);
    expect(hasFailedLately(store, passage)).toBe(false);
  });
});
