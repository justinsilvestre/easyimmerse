import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function recordDebounced(delayMs: number) {
  const calls: string[] = [];
  const debounced = debounce((value: string) => calls.push(value), delayMs);
  return { calls, debounced };
}

describe("debounce", () => {
  it("does not call through before the delay has passed", () => {
    const { calls, debounced } = recordDebounced(300);
    debounced("a");
    vi.advanceTimersByTime(299);
    expect(calls).toEqual([]);
  });

  it("calls through once the delay has passed", () => {
    const { calls, debounced } = recordDebounced(300);
    debounced("a");
    vi.advanceTimersByTime(300);
    expect(calls).toEqual(["a"]);
  });

  it("calls through only with the last of several quick calls", () => {
    const { calls, debounced } = recordDebounced(300);
    debounced("a");
    vi.advanceTimersByTime(200);
    debounced("ab");
    vi.advanceTimersByTime(300);
    expect(calls).toEqual(["ab"]);
  });

  it("drops the pending call when cancelled", () => {
    const { calls, debounced } = recordDebounced(300);
    debounced("a");
    debounced.cancel();
    vi.advanceTimersByTime(300);
    expect(calls).toEqual([]);
  });
});
