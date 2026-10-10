import { describe, expect, it } from "vitest";
import { isAborted } from "./isAborted.ts";

describe("isAborted", () => {
  it("is true for a request that was aborted", () => {
    const outcome = {
      ok: false,
      error: { status: "ABORTED", message: "" },
    } as const;
    expect(isAborted(outcome)).toBe(true);
  });

  it("is false for a request that failed otherwise", () => {
    const outcome = { ok: false, error: { status: 500, message: "" } } as const;
    expect(isAborted(outcome)).toBe(false);
  });
});
