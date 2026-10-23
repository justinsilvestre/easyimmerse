import { describe, expect, it } from "vitest";
import { spacedCode } from "./spacedCode.ts";

describe("spacedCode", () => {
  it("splits six digits in two groups of three", () => {
    expect(spacedCode("123456")).toBe("123 456");
  });

  it("leaves a code of another length as it is", () => {
    expect(spacedCode("1234")).toBe("1234");
  });
});
