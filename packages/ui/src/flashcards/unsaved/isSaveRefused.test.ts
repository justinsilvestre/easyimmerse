import { describe, expect, it } from "vitest";
import { isSaveRefused } from "./isSaveRefused.ts";

describe("isSaveRefused", () => {
  it("counts a request the server cannot process as refused", () => {
    expect(isSaveRefused({ status: 422 })).toBe(true);
  });

  it.each([401, 403, 408, 429])(
    "counts status %i as an ordinary failure, which a retry may cure",
    (status) => {
      expect(isSaveRefused({ status })).toBe(false);
    },
  );

  it("counts a server error as an ordinary failure", () => {
    expect(isSaveRefused({ status: 500 })).toBe(false);
  });

  it("counts a lost connection as an ordinary failure", () => {
    expect(isSaveRefused(new TypeError("Failed to fetch"))).toBe(false);
  });
});
