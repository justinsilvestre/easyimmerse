import { describe, expect, it } from "vitest";
import { formatInflectionChain } from "./formatInflectionChain.ts";

describe("formatInflectionChain", () => {
  it("lists the inflections from the dictionary form outwards", () => {
    expect(formatInflectionChain(["past", "negative"])).toBe("negative ‹ past");
  });
});
