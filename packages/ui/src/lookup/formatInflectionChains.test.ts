import { describe, expect, it } from "vitest";
import { formatInflectionChains } from "./formatInflectionChains.ts";

describe("formatInflectionChains", () => {
  it("writes nothing for a result without inflections", () => {
    expect(formatInflectionChains([])).toEqual([]);
  });

  it("writes a single chain from the dictionary form outwards", () => {
    expect(formatInflectionChains([["past", "negative"]])).toEqual([
      "negative ‹ past",
    ]);
  });

  it("joins the alternatives of chains that differ in one step", () => {
    expect(
      formatInflectionChains([
        ["past", "negative", "potential", "causative"],
        ["past", "negative", "passive", "causative"],
      ]),
    ).toEqual(["causative ‹ potential or passive ‹ negative ‹ past"]);
  });

  it("joins the alternatives of one-step chains", () => {
    expect(
      formatInflectionChains([["present 2pl"], ["imperative pl"]]),
    ).toEqual(["present 2pl or imperative pl"]);
  });

  it("writes chains that differ in two steps on lines of their own", () => {
    expect(
      formatInflectionChains([
        ["past", "potential"],
        ["negative", "passive"],
      ]),
    ).toEqual(["potential ‹ past", "passive ‹ negative"]);
  });
});
