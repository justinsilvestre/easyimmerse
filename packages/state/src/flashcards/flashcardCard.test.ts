import { describe, expect, it } from "vitest";
import {
  exampleListedFlashcard,
  exampleNewFlashcard,
} from "./exampleFlashcards.ts";
import {
  editCard,
  existingCard,
  newCard,
  newFlashcardSegmentId,
  segmentIdOf,
  withLookupFields,
  withScreenshot,
} from "./flashcardCard.ts";

const katze = newCard(exampleNewFlashcard("f1", "Katze"));
const fields = {
  word: "Katze",
  word_pronunciation: "ˈkat͡sə",
  l1_definition: "cat",
  l2_definition: "",
};

const typed = (key: "word" | "l1_definition", value: string) =>
  editCard(katze, { type: "textChanged", key, value });

describe("newCard", () => {
  it("starts with the draft's content", () => {
    expect(katze.editor.content.word).toBe("Katze");
  });

  it("starts with the draft's included fields", () => {
    expect(katze.editor.includedFields).toEqual(["word"]);
  });

  it("starts unchanged", () => {
    expect(katze.isChanged).toBe(false);
  });
});

describe("editCard", () => {
  it("applies the change to the card's content", () => {
    expect(typed("word", "Kater").editor.content.word).toBe("Kater");
  });

  it("marks a card changed once the user edits it", () => {
    expect(typed("word", "Kater").isChanged).toBe(true);
  });

  it("marks a saved card changed once the user edits it", () => {
    const hund = existingCard(exampleListedFlashcard("h", "Hund"));
    expect(
      editCard(hund, { type: "tagsChanged", tags: ["pets"] }).isChanged,
    ).toBe(true);
  });

  it("keeps a card that the change leaves as it is", () => {
    expect(editCard(katze, { type: "screenshotMsChanged", ms: 5 })).toBe(katze);
  });
});

describe("withLookupFields", () => {
  it("fills the fields of a new card", () => {
    expect(withLookupFields(katze, fields).editor.content.l1_definition).toBe(
      "cat",
    );
  });

  it("leaves alone a field the user has typed in", () => {
    const card = withLookupFields(typed("l1_definition", "a pet"), fields);
    expect(card.editor.content.l1_definition).toBe("a pet");
  });

  it("leaves alone a field the user has emptied", () => {
    const card = withLookupFields(typed("l1_definition", ""), fields);
    expect(card.editor.content.l1_definition).toBe("");
  });

  it("replaces the word the user has not typed in, as with a dictionary form", () => {
    const card = withLookupFields(katze, { ...fields, word: "die Katze" });
    expect(card.editor.content.word).toBe("die Katze");
  });

  it("leaves a card unchanged when the lookup fills it", () => {
    expect(withLookupFields(katze, fields).isChanged).toBe(false);
  });
});

describe("withScreenshot", () => {
  it("gives a new card without a screenshot one from the middle of its clip", () => {
    expect(withScreenshot(katze).editor.content.screenshot).toEqual({
      at_ms: 1500,
    });
  });

  it("keeps a new card's screenshot where it is", () => {
    const withShot = {
      ...katze,
      editor: {
        ...katze.editor,
        content: { ...katze.editor.content, screenshot: { at_ms: 1200 } },
      },
    };
    expect(withScreenshot(withShot).editor.content.screenshot).toEqual({
      at_ms: 1200,
    });
  });

  it("gives no screenshot to a new card without a clip", () => {
    const card = {
      ...katze,
      editor: {
        ...katze.editor,
        content: { ...katze.editor.content, audio_context: null },
      },
    };
    expect(withScreenshot(card).editor.content.screenshot).toBeNull();
  });
});

describe("segmentIdOf", () => {
  it("gives a saved flashcard its own id", () => {
    expect(segmentIdOf(existingCard(exampleListedFlashcard("h", "Hund")))).toBe(
      "h",
    );
  });

  it("gives a new flashcard the id reserved for it", () => {
    expect(segmentIdOf(katze)).toBe(newFlashcardSegmentId);
  });
});
