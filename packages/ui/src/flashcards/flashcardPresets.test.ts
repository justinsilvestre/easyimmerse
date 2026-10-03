import { describe, expect, it } from "vitest";
import { fieldsOfPreset, presetMatching } from "./flashcardPresets.ts";

describe("fieldsOfPreset", () => {
  it("includes the pronunciation fields for beginners", () => {
    expect(fieldsOfPreset("beginner")).toContain("wordPronunciation");
  });

  it("excludes the pronunciation fields for intermediate learners", () => {
    expect(fieldsOfPreset("intermediate")).not.toContain("wordPronunciation");
  });

  it("excludes the L1 definition for advanced learners", () => {
    expect(fieldsOfPreset("advanced")).not.toContain("l1Definition");
  });

  it("includes the L2 definition for advanced learners", () => {
    expect(fieldsOfPreset("advanced")).toContain("l2Definition");
  });
});

describe("presetMatching", () => {
  it("names the preset whose fields are selected, in any order", () => {
    expect(presetMatching([...fieldsOfPreset("advanced")].reverse())).toBe(
      "advanced",
    );
  });

  it("is custom once a field is removed from a preset", () => {
    expect(presetMatching(fieldsOfPreset("beginner").slice(1))).toBe("custom");
  });
});
