import { describe, expect, it } from "vitest";
import { hasFailedLately, withFailure } from "./failedPassages.ts";

const passage = { language: "ja", text: "猫が好き" };
const minuteMs = 60_000;

describe("hasFailedLately", () => {
  it("reports a passage whose batch failed a moment ago", () => {
    const retryTimes = withFailure({}, [passage], 0);
    expect(hasFailedLately(retryTimes, passage, 1)).toBe(true);
  });

  it("forgets a failure after five minutes", () => {
    const retryTimes = withFailure({}, [passage], 0);
    expect(hasFailedLately(retryTimes, passage, 5 * minuteMs)).toBe(false);
  });

  it("reports nothing for a passage that never failed", () => {
    expect(hasFailedLately({}, passage, 0)).toBe(false);
  });
});

describe("withFailure", () => {
  it("drops the failures that may already be retried", () => {
    const retryTimes = withFailure(
      withFailure({}, [passage], 0),
      [{ language: "ja", text: "犬" }],
      5 * minuteMs,
    );
    expect(hasFailedLately(retryTimes, passage, 0)).toBe(false);
  });
});
