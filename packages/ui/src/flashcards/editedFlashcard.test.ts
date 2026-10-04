import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  type EditedFlashcard,
  flashcardsOnWaveform,
  newFlashcardSegmentId,
  reduceEditedFlashcard,
  segmentIdOf,
} from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";

function createFlashcard(id: string): Flashcard {
  return {
    id,
    project_id: "p1",
    media_file_id: "m1",
    cue_index: null,
    content: exampleFlashcard,
    included_fields: ["word"],
    created_at_ms: 0,
    updated_at_ms: 0,
  };
}

function createDraft(): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    content: { ...exampleFlashcard, word: "Katze" },
    included_fields: ["word", "tags"],
  };
}

function openedFlashcard(flashcard = createFlashcard("f1")): EditedFlashcard {
  const opened = reduceEditedFlashcard(null, { type: "opened", flashcard });
  if (opened === null) throw new Error("The flashcard did not open.");
  return opened;
}

const movedClip = { start_ms: 1000, end_ms: 3000 };

describe("reduceEditedFlashcard", () => {
  it("starts editing a draft with its content", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      draft: createDraft(),
    });
    expect(edited?.editor.content.word).toBe("Katze");
  });

  it("starts editing a draft with its included fields", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      draft: createDraft(),
    });
    expect(edited?.editor.includedFields).toEqual(["word", "tags"]);
  });

  it("opens a saved flashcard with its content", () => {
    expect(openedFlashcard().editor.content).toEqual(exampleFlashcard);
  });

  it("applies an editor action to the open flashcard", () => {
    const edited = reduceEditedFlashcard(openedFlashcard(), {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(edited?.editor.content.audio_context).toEqual(movedClip);
  });

  it("ignores an editor action while no flashcard is open", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(edited).toBeNull();
  });

  it("closes the open flashcard", () => {
    expect(
      reduceEditedFlashcard(openedFlashcard(), { type: "closed" }),
    ).toBeNull();
  });
});

describe("segmentIdOf", () => {
  it("gives a saved flashcard its own id", () => {
    expect(segmentIdOf(openedFlashcard())).toBe("f1");
  });

  it("gives a new flashcard the id reserved for it", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      draft: createDraft(),
    });
    expect(edited && segmentIdOf(edited)).toBe(newFlashcardSegmentId);
  });
});

describe("flashcardsOnWaveform", () => {
  it("draws the saved flashcards while none is open", () => {
    const flashcards = [createFlashcard("f1"), createFlashcard("f2")];
    expect(flashcardsOnWaveform(flashcards, null)).toEqual([
      { id: "f1", content: exampleFlashcard },
      { id: "f2", content: exampleFlashcard },
    ]);
  });

  it("draws the open flashcard with its unsaved content", () => {
    const edited = reduceEditedFlashcard(openedFlashcard(), {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(
      flashcardsOnWaveform([createFlashcard("f1")], edited)[0]?.content
        .audio_context,
    ).toEqual(movedClip);
  });

  it("draws a new flashcard after the saved ones", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      draft: createDraft(),
    });
    expect(
      flashcardsOnWaveform([createFlashcard("f1")], edited).map(({ id }) => id),
    ).toEqual(["f1", newFlashcardSegmentId]);
  });
});
