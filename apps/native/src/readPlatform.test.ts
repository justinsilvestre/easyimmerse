import { describe, expect, it } from "vitest";
import { readPlatform } from "./readPlatform.ts";

describe("readPlatform", () => {
  it("recognizes desktop operating systems", () => {
    expect(readPlatform("darwin")).toBe("desktop");
  });

  it("recognizes mobile operating systems", () => {
    expect(readPlatform("android")).toBe("mobile");
  });
});
