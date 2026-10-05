import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeLimit } from "./withTimeLimit.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

const never = () => new Promise<never>(() => undefined);

describe("withTimeLimit", () => {
  it("resolves what the work resolves in time", async () => {
    await expect(
      withTimeLimit(() => Promise.resolve("saved"), 100),
    ).resolves.toBe("saved");
  });

  it("rejects once the limit passes first", async () => {
    const outcome = expect(withTimeLimit(never, 100)).rejects.toThrow(
      "No answer within 100 ms",
    );
    await vi.advanceTimersByTimeAsync(100);
    await outcome;
  });

  it("aborts the work's signal once the limit passes", async () => {
    let workSignal: AbortSignal | undefined;
    withTimeLimit((signal) => {
      workSignal = signal;
      return never();
    }, 100).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);
    expect(workSignal?.aborted).toBe(true);
  });
});
