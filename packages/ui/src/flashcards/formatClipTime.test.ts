import { describe, expect, it } from "vitest";
import { formatClipTime } from "./formatClipTime.ts";

describe("formatClipTime", () => {
  it("shows tenths of a second", () => {
    expect(formatClipTime(62_340)).toBe("1:02.3");
  });
});
