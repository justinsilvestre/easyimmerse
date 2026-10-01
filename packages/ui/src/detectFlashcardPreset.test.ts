import { describe, expect, it } from "vitest";
import { detectFlashcardPreset } from "./detectFlashcardPreset.ts";

describe("detectFlashcardPreset", () => {
  it("recognizes the beginner fields", () => {
    expect(
      detectFlashcardPreset([
        "word",
        "word_pronunciation",
        "l1_definition",
        "context",
        "context_translation",
        "context_pronunciation",
        "context_audio",
        "screenshot",
      ]),
    ).toBe("beginner");
  });

  it("recognizes the advanced fields", () => {
    expect(
      detectFlashcardPreset([
        "word",
        "l2_definition",
        "context",
        "context_audio",
        "screenshot",
      ]),
    ).toBe("advanced");
  });

  it("ignores the order of the fields", () => {
    expect(
      detectFlashcardPreset([
        "screenshot",
        "context_audio",
        "context",
        "l2_definition",
        "word",
      ]),
    ).toBe("advanced");
  });

  it("returns null for a custom selection", () => {
    expect(detectFlashcardPreset(["word", "context"])).toBeNull();
  });

  it("returns null when the selection adds a field to a preset", () => {
    expect(
      detectFlashcardPreset([
        "word",
        "l1_definition",
        "l2_definition",
        "context",
        "context_audio",
        "screenshot",
      ]),
    ).toBeNull();
  });
});
