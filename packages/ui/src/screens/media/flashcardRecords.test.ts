import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleFlashcard } from "../../flashcards/exampleFlashcard.ts";
import {
  cueIndexesWithFlashcards,
  saveRequestOf,
  segmentsOfFlashcards,
} from "./flashcardRecords.ts";

const flashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  fields: {
    ...exampleFlashcard,
    audio_context: { start_ms: 1000, end_ms: 2000 },
    screenshot_at_ms: null,
  },
  included_fields: ["word"],
  has_screenshot_image: false,
  created_at_ms: 0,
  updated_at_ms: 0,
};

describe("segmentsOfFlashcards", () => {
  it("puts the screenshot marker in the middle of a clip without a screenshot", () => {
    expect(segmentsOfFlashcards([flashcard], null)[0]?.screenshotMs).toBe(1500);
  });

  it("draws the edited flashcard where the editor has moved it", () => {
    expect(
      segmentsOfFlashcards([flashcard], {
        id: "f1",
        clip: { start_ms: 1200, end_ms: 2500 },
        screenshotMs: 1300,
      }),
    ).toEqual([{ id: "f1", startMs: 1200, endMs: 2500, screenshotMs: 1300 }]);
  });
});

describe("cueIndexesWithFlashcards", () => {
  it("lists the cues whose middle lies in a flashcard's clip", () => {
    expect(
      cueIndexesWithFlashcards(
        [
          { index: 1, start_ms: 900, end_ms: 1900, text: "a" },
          { index: 2, start_ms: 1900, end_ms: 3000, text: "b" },
        ],
        segmentsOfFlashcards([flashcard], null),
      ),
    ).toEqual([1]);
  });
});

describe("saveRequestOf", () => {
  it("sends a screenshot that differs from the stored one", () => {
    expect(
      saveRequestOf(exampleFlashcard, ["word"], "m1", null).screenshot_data_url,
    ).toBe(exampleFlashcard.screenshot?.url);
  });

  it("leaves out the screenshot image when it is the stored one", () => {
    expect(
      saveRequestOf(
        exampleFlashcard,
        ["word"],
        "m1",
        exampleFlashcard.screenshot?.url ?? null,
      ).screenshot_data_url,
    ).toBeNull();
  });
});
