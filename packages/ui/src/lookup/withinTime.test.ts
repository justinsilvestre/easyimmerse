import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withinTime } from "./withinTime.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("withinTime", () => {
  it("resolves what arrives in time", async () => {
    expect(await withinTime(Promise.resolve("found"), 100, "none")).toBe(
      "found",
    );
  });

  it("resolves the fallback once the time has passed", async () => {
    const result = withinTime(
      new Promise<string>(() => undefined),
      100,
      "none",
    );
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toBe("none");
  });

  it("resolves the fallback when the promise fails", async () => {
    expect(await withinTime(Promise.reject(new Error()), 100, "none")).toBe(
      "none",
    );
  });
});
