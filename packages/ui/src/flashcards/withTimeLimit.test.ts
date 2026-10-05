import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeLimit } from "./withTimeLimit.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("withTimeLimit", () => {
  it("resolves what the promise resolves in time", async () => {
    await expect(withTimeLimit(Promise.resolve("saved"), 100)).resolves.toBe(
      "saved",
    );
  });

  it("rejects once the limit passes first", async () => {
    const limited = withTimeLimit(new Promise(() => undefined), 100);
    const outcome = expect(limited).rejects.toThrow("No answer within 100 ms");
    await vi.advanceTimersByTimeAsync(100);
    await outcome;
  });
});
