import { describe, expect, it } from "vitest";
import { readMailedLink } from "./readMailedLink.ts";

describe("readMailedLink", () => {
  it("reads a link that confirms an email address", () => {
    expect(readMailedLink("?confirm_email=abc").link).toEqual({
      kind: "confirmEmail",
      token: "abc",
    });
  });

  it("reads a link that resets a password", () => {
    expect(readMailedLink("?reset_password=abc").link).toEqual({
      kind: "resetPassword",
      token: "abc",
    });
  });

  it("finds no link in an address without one", () => {
    expect(readMailedLink("?other=1").link).toBeNull();
  });

  it("finds no link whose token is empty", () => {
    expect(readMailedLink("?confirm_email=").link).toBeNull();
  });

  it("finds no link whose parameter has no value", () => {
    expect(readMailedLink("?reset_password").link).toBeNull();
  });

  it("leaves the other parameters of the address", () => {
    expect(readMailedLink("?a=1&confirm_email=abc&b=2").search).toBe(
      "?a=1&b=2",
    );
  });

  it("leaves no question mark once the link was the only parameter", () => {
    expect(readMailedLink("?reset_password=abc").search).toBe("");
  });
});
