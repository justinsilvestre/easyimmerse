import { describe, expect, it } from "vitest";
import { isOwnTokenRefused } from "./isOwnTokenRefused.ts";

describe("isOwnTokenRefused", () => {
  it("tells of the app's token refused by its server", () => {
    expect(isOwnTokenRefused({ status: 401, code: "unauthorized" })).toBe(true);
  });

  it("tells of a 401 without a code as the app's token refused", () => {
    expect(isOwnTokenRefused({ status: 401 })).toBe(true);
  });

  it("does not count a remote's refusal of the email and password", () => {
    expect(
      isOwnTokenRefused({ status: 401, code: "invalid_credentials" }),
    ).toBe(false);
  });

  it("does not count a remote that logged the built-in server out", () => {
    expect(isOwnTokenRefused({ status: 401, code: "remote_logged_out" })).toBe(
      false,
    );
  });

  it("does not count another failure", () => {
    expect(isOwnTokenRefused({ status: 403, code: "forbidden" })).toBe(false);
  });
});
