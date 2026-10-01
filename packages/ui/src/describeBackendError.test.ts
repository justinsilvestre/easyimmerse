import { describe, expect, it } from "vitest";
import { describeBackendError } from "./describeBackendError.ts";

describe("describeBackendError", () => {
  it("returns the error's message", () => {
    expect(describeBackendError({ status: 400, message: "Bad zip" })).toBe(
      "Bad zip",
    );
  });

  it("returns a general message for an error without one", () => {
    expect(describeBackendError(undefined)).toBe("The request failed.");
  });
});
