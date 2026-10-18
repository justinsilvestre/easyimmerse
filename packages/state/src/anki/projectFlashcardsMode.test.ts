import { describe, expect, it } from "vitest";
import { projectFlashcardsModeOf } from "./projectFlashcardsMode.ts";
import type { FlashcardSync } from "./selectFlashcardSync.ts";

const neverDelivered: FlashcardSync = {
  flashcardCount: 2,
  queue: { newCount: 2, changedCount: 0, hasBeenFlushed: false },
  package: { deletions: [], ankiSearch: "" },
  ankiConnect: null,
  nextCard: null,
};

const delivered: FlashcardSync = {
  ...neverDelivered,
  queue: { newCount: 1, changedCount: 0, hasBeenFlushed: true },
};

const ankiConnectOn = {
  connection: "connected",
  deniedOrigin: null,
  pendingDeletionCount: 0,
  isSyncing: false,
  hasSyncFailed: false,
} as const;

describe("projectFlashcardsModeOf", () => {
  it("offers every way to use the flashcards before any has reached Anki", () => {
    expect(projectFlashcardsModeOf(neverDelivered)).toBe("fresh");
  });

  it("puts the package first once flashcards have reached Anki", () => {
    expect(projectFlashcardsModeOf(delivered)).toBe("package");
  });

  it("puts the package first while deleted flashcards that reached Anki are listed", () => {
    expect(
      projectFlashcardsModeOf({
        ...neverDelivered,
        package: {
          deletions: [
            { flashcard_id: "f9", word: "Katze", requested_at_ms: 1 },
          ],
          ankiSearch: '"easyImmerse id:f9"',
        },
      }),
    ).toBe("package");
  });

  it("puts AnkiConnect first while it is on, before any flashcard has reached Anki", () => {
    expect(
      projectFlashcardsModeOf({
        ...neverDelivered,
        ankiConnect: ankiConnectOn,
      }),
    ).toBe("ankiConnect");
  });

  it("puts AnkiConnect first while it is on, after flashcards have reached Anki", () => {
    expect(
      projectFlashcardsModeOf({ ...delivered, ankiConnect: ankiConnectOn }),
    ).toBe("ankiConnect");
  });
});
