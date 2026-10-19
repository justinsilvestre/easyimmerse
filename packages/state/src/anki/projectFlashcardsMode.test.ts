import { describe, expect, it } from "vitest";
import { projectFlashcardsModeOf } from "./projectFlashcardsMode.ts";
import type { AnkiConnectSync, FlashcardSync } from "./selectFlashcardSync.ts";

const ankiConnectAs = (isOn: boolean): AnkiConnectSync => ({
  isOn,
  connection: "connected",
  deniedOrigin: null,
  pendingDeletionCount: 0,
  isSyncing: false,
  hasSyncFailed: false,
});

const neverDelivered: FlashcardSync = {
  flashcardCount: 2,
  queue: {
    newCount: 2,
    changedCount: 0,
    hasBeenSent: false,
    hasBeenExported: false,
  },
  package: { deletions: [], ankiSearch: "" },
  ankiConnect: ankiConnectAs(false),
  nextCard: null,
  review: {
    dueCount: 0,
    newCount: 0,
    nextDueAtMs: null,
    nextCard: null,
    hasProgress: false,
  },
};

const reviewed = (sync: FlashcardSync): FlashcardSync => ({
  ...sync,
  review: { ...sync.review, dueCount: 3, hasProgress: true },
});

const deliveredBy = (
  ways: { hasBeenSent?: boolean; hasBeenExported?: boolean },
  isAnkiConnectOn = false,
): FlashcardSync => ({
  ...neverDelivered,
  queue: { ...neverDelivered.queue, newCount: 1, ...ways },
  ankiConnect: ankiConnectAs(isAnkiConnectOn),
});

describe("projectFlashcardsModeOf", () => {
  it("offers every way to use the flashcards before any has reached Anki", () => {
    expect(projectFlashcardsModeOf(neverDelivered)).toBe("fresh");
  });

  it("puts the package first once flashcards have been exported in one", () => {
    expect(
      projectFlashcardsModeOf(deliveredBy({ hasBeenExported: true })),
    ).toBe("package");
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
    expect(projectFlashcardsModeOf(deliveredBy({}, true))).toBe("ankiConnect");
  });

  it("puts AnkiConnect first while it is on, after flashcards have been exported in a package", () => {
    expect(
      projectFlashcardsModeOf(deliveredBy({ hasBeenExported: true }, true)),
    ).toBe("ankiConnect");
  });

  it("puts AnkiConnect first while it is off, once flashcards have been sent through it", () => {
    expect(projectFlashcardsModeOf(deliveredBy({ hasBeenSent: true }))).toBe(
      "ankiConnect",
    );
  });

  it("puts AnkiConnect first while it is off, once flashcards have reached Anki both ways", () => {
    expect(
      projectFlashcardsModeOf(
        deliveredBy({ hasBeenSent: true, hasBeenExported: true }),
      ),
    ).toBe("ankiConnect");
  });

  it("puts the review first once it has progress", () => {
    expect(projectFlashcardsModeOf(reviewed(neverDelivered))).toBe("review");
  });

  it("puts the review before the package once both are in use", () => {
    expect(
      projectFlashcardsModeOf(reviewed(deliveredBy({ hasBeenExported: true }))),
    ).toBe("review");
  });

  it("puts AnkiConnect before the review while it is on", () => {
    expect(projectFlashcardsModeOf(reviewed(deliveredBy({}, true)))).toBe(
      "ankiConnect",
    );
  });
});
