import { describe, expect, it } from "vitest";
import {
  largerTextScale,
  parseTextScale,
  smallerTextScale,
} from "./textScale.ts";

describe("parseTextScale", () => {
  it("accepts a known scale", () => {
    expect(parseTextScale("125")).toBe(125);
  });

  it("falls back to the default for an unknown value", () => {
    expect(parseTextScale("99")).toBe(100);
  });

  it("falls back to the default when nothing is stored", () => {
    expect(parseTextScale(undefined)).toBe(100);
  });
});

describe("largerTextScale", () => {
  it("steps up to the next scale", () => {
    expect(largerTextScale(100)).toBe(112.5);
  });

  it("stays at the largest scale", () => {
    expect(largerTextScale(175)).toBe(175);
  });
});

describe("smallerTextScale", () => {
  it("steps down to the next scale", () => {
    expect(smallerTextScale(100)).toBe(87.5);
  });

  it("stays at the smallest scale", () => {
    expect(smallerTextScale(75)).toBe(75);
  });
});
