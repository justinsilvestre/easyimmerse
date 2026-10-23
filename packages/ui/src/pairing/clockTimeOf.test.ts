import { describe, expect, it } from "vitest";
import { clockTimeOf } from "./clockTimeOf.ts";

const moment = Date.UTC(2026, 9, 22, 14, 32);

describe("clockTimeOf", () => {
  it("shows the hours and minutes in the locale's style", () => {
    expect(clockTimeOf(moment, "en-GB", "UTC")).toBe("14:32");
  });

  it("shows the time in the given time zone", () => {
    expect(clockTimeOf(moment, "en-GB", "Asia/Tokyo")).toBe("23:32");
  });
});
