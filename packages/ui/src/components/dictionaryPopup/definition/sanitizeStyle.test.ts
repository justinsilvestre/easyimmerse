import { describe, expect, it } from "vitest";
import { parseStyleAttribute, sanitizeStyle } from "./sanitizeStyle.ts";

describe("sanitizeStyle", () => {
  it("keeps an allowed property", () => {
    expect(sanitizeStyle({ fontWeight: "bold" })).toEqual({
      fontWeight: "bold",
    });
  });

  it("drops a property outside the allowlist", () => {
    expect(sanitizeStyle({ position: "fixed" })).toEqual({});
  });

  it("drops the background shorthand, which can load images", () => {
    expect(sanitizeStyle({ background: "red" })).toEqual({});
  });

  it("drops a value that loads a resource", () => {
    expect(
      sanitizeStyle({ backgroundColor: "red url(https://example.com/a.png)" }),
    ).toEqual({});
  });

  it("drops a value that uses image-set", () => {
    expect(sanitizeStyle({ color: "image-set('a.png' 1x)" })).toEqual({});
  });

  it("drops a value that uses expression", () => {
    expect(sanitizeStyle({ color: "EXPRESSION(alert(1))" })).toEqual({});
  });

  it("drops a value containing an at sign", () => {
    expect(sanitizeStyle({ fontSize: "@import" })).toEqual({});
  });

  it("drops a value containing a backslash escape", () => {
    expect(sanitizeStyle({ color: "\\75rl(x)" })).toEqual({});
  });

  it("reads a number given for a margin as a length in em", () => {
    expect(sanitizeStyle({ marginLeft: 0.5 })).toEqual({ marginLeft: "0.5em" });
  });

  it("joins a list of decoration lines", () => {
    expect(
      sanitizeStyle({ textDecorationLine: ["underline", "overline"] }),
    ).toEqual({ textDecorationLine: "underline overline" });
  });
});

describe("parseStyleAttribute", () => {
  it("reads declarations into camel-cased properties", () => {
    expect(parseStyleAttribute("font-weight: bold; color:red")).toEqual({
      fontWeight: "bold",
      color: "red",
    });
  });

  it("ignores a declaration without a value", () => {
    expect(parseStyleAttribute("color")).toEqual({});
  });
});
