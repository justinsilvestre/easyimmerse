import { describe, expect, it } from "vitest";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
  presetMatching,
} from "./flashcardPresets.ts";

describe("fieldsOfPreset", () => {
  it("includes the pronunciation fields for beginners", () => {
    expect(fieldsOfPreset("beginner")).toContain("word_pronunciation");
  });

  it("excludes the pronunciation fields for intermediate learners", () => {
    expect(fieldsOfPreset("intermediate")).not.toContain("word_pronunciation");
  });

  it("excludes the L1 definition for advanced learners", () => {
    expect(fieldsOfPreset("advanced")).not.toContain("l1_definition");
  });

  it("includes the L2 definition for advanced learners", () => {
    expect(fieldsOfPreset("advanced")).toContain("l2_definition");
  });
});

describe("frontFieldsOfPreset", () => {
  it("puts the sentence audio and the screenshot on the front for beginners", () => {
    expect(frontFieldsOfPreset("beginner")).toEqual([
      "audio_context",
      "screenshot",
    ]);
  });

  it("puts the sentence audio and the screenshot on the front for intermediate learners", () => {
    expect(frontFieldsOfPreset("intermediate")).toEqual([
      "audio_context",
      "screenshot",
    ]);
  });

  it("puts the word, the sentence and the screenshot on the front for advanced learners", () => {
    expect(frontFieldsOfPreset("advanced")).toEqual([
      "word",
      "text_context",
      "screenshot",
    ]);
  });
});

describe("presetMatching", () => {
  it("names the preset whose fields are selected, in any order", () => {
    expect(
      presetMatching(
        [...fieldsOfPreset("advanced")].reverse(),
        [...frontFieldsOfPreset("advanced")].reverse(),
      ),
    ).toBe("advanced");
  });

  it("is custom once a field is removed from a preset", () => {
    expect(
      presetMatching(
        fieldsOfPreset("beginner").slice(1),
        frontFieldsOfPreset("beginner"),
      ),
    ).toBe("custom");
  });

  it("is custom once a field of a preset moves to the front", () => {
    expect(
      presetMatching(fieldsOfPreset("intermediate"), [
        ...frontFieldsOfPreset("intermediate"),
        "word",
      ]),
    ).toBe("custom");
  });

  it("ignores front fields that are not included", () => {
    expect(
      presetMatching(fieldsOfPreset("intermediate"), [
        ...frontFieldsOfPreset("intermediate"),
        "word_pronunciation",
      ]),
    ).toBe("intermediate");
  });
});
