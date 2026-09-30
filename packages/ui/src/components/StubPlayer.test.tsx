import { describe, expect, it } from "vitest";
import { formatPlayerTime } from "./StubPlayer.tsx";

describe("formatPlayerTime", () => {
  it("formats zero as 0:00.0", () => {
    expect(formatPlayerTime(0)).toBe("0:00.0");
  });

  it("rounds to a tenth of a second", () => {
    expect(formatPlayerTime(1.75)).toBe("0:01.8");
  });

  it("carries whole minutes into the minute field", () => {
    expect(formatPlayerTime(125.2)).toBe("2:05.2");
  });
});
