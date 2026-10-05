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

describe("reduceEditedFlashcard on screenshotsAvailable", () => {
  const startDraft = (content: Partial<FlashcardDraft["content"]>) =>
    reduceEditedFlashcard(null, {
      type: "started",
      draft: {
        ...createDraft(),
        content: { ...createDraft().content, ...content },
      },
    });

  it("gives a new flashcard without a screenshot one from the middle of its clip", () => {
    const started = startDraft({ audio_context: movedClip, screenshot: null });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toEqual({ at_ms: 2000 });
  });

  it("keeps a new flashcard's screenshot where it is", () => {
    const started = startDraft({
      audio_context: movedClip,
      screenshot: { at_ms: 2900 },
    });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toEqual({ at_ms: 2900 });
  });

  it("gives no screenshot to a new flashcard without a clip", () => {
    const started = startDraft({ audio_context: null, screenshot: null });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toBeNull();
  });

  it("leaves a saved flashcard as it is", () => {
    const opened = openedFlashcard({
      ...createFlashcard("f1"),
      content: { ...exampleFlashcard, screenshot: null },
    });
    expect(
      reduceEditedFlashcard(opened, { type: "screenshotsAvailable" }),
    ).toBe(opened);
  });
});

describe("reduceEditedFlashcard on lookupAnswered", () => {
  const fields = {
    word: "Katze",
    word_pronunciation: "ˈkat͡sə",
    l1_definition: "cat",
    l2_definition: "Haustier",
  };

  function startedWith(draft: FlashcardDraft) {
    return reduceEditedFlashcard(null, { type: "started", draft });
  }

  it("fills the fields of the new flashcard it was made for", () => {
    const draft = createDraft();
    const edited = reduceEditedFlashcard(startedWith(draft), {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.l1_definition).toBe("cat");
  });

  it("leaves alone a field the user has typed in", () => {
    const draft = createDraft();
    const typed = reduceEditedFlashcard(startedWith(draft), {
      type: "edited",
      action: { type: "textChanged", key: "l1_definition", value: "kitty" },
    });
    const edited = reduceEditedFlashcard(typed, {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.l1_definition).toBe("kitty");
  });

  it("leaves alone a field the user has emptied", () => {
    const draft = createDraft();
    const typed = reduceEditedFlashcard(startedWith(draft), {
      type: "edited",
      action: { type: "textChanged", key: "word", value: "" },
    });
    const edited = reduceEditedFlashcard(typed, {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.word).toBe("");
  });

  it("ignores an answer for another flashcard", () => {
    const edited = startedWith(createDraft());
    expect(
      reduceEditedFlashcard(edited, {
        type: "lookupAnswered",
        draft: createDraft(),
        fields,
      }),
    ).toBe(edited);
  });
});
