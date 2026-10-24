import { describe, expect, it } from "vitest";
import { formatServerLog } from "./formatServerLog.ts";

describe("formatServerLog", () => {
  it("writes each record on a line with its time, level and module", () => {
    expect(
      formatServerLog([
        {
          time_ms: Date.UTC(2026, 9, 22, 14, 3, 7),
          level: "warn",
          target: "easyimmerse_api::serve",
          message: "slow request",
        },
        {
          time_ms: Date.UTC(2026, 9, 22, 14, 3, 8),
          level: "info",
          target: "easyimmerse_native",
          message: "started",
        },
      ]),
    ).toBe(
      "2026-10-22T14:03:07.000Z WARN easyimmerse_api::serve: slow request\n2026-10-22T14:03:08.000Z INFO easyimmerse_native: started",
    );
  });

  it("writes nothing for an empty log", () => {
    expect(formatServerLog([])).toBe("");
  });
});
