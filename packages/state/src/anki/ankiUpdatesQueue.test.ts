import { describe, expect, it } from "vitest";
import { ankiFlashcard } from "./ankiTestSupport.ts";
import {
  isChangedSinceDelivered,
  isNeverDelivered,
  isQueued,
} from "./ankiUpdatesQueue.ts";

describe("isNeverDelivered", () => {
  it("is true for a flashcard never sent or marked as exported", () => {
    expect(isNeverDelivered(ankiFlashcard("f1", "m1", 1))).toBe(true);
  });

  it("is false for a flashcard sent through AnkiConnect", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 });
    expect(isNeverDelivered(flashcard)).toBe(false);
  });

  it("is false for a flashcard marked as exported", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, { exportedAtMs: 5 });
    expect(isNeverDelivered(flashcard)).toBe(false);
  });
});

describe("isChangedSinceDelivered", () => {
  it("is true for an edit saved in the same millisecond as the send", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 50,
      updatedAtMs: 50,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(true);
  });

  it("is true for an edit saved in the same millisecond as the export", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 50,
      updatedAtMs: 50,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(true);
  });

  it("is false for a flashcard edited before the send", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 50,
      updatedAtMs: 49,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(false);
  });

  it("is false for a flashcard edited before the export", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 50,
      updatedAtMs: 49,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(false);
  });

  it("is false for a flashcard edited after an export and then sent", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 10,
      updatedAtMs: 11,
      sentAtMs: 20,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(false);
  });

  it("is false for a flashcard edited after a send and then exported", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 10,
      updatedAtMs: 11,
      exportedAtMs: 20,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(false);
  });

  it("is true for a flashcard edited after both a send and an export", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 10,
      exportedAtMs: 20,
      updatedAtMs: 21,
    });
    expect(isChangedSinceDelivered(flashcard)).toBe(true);
  });

  it("is false for a flashcard never delivered", () => {
    expect(isChangedSinceDelivered(ankiFlashcard("f1", "m1", 1))).toBe(false);
  });
});

describe("isQueued", () => {
  it("is true for a flashcard never delivered", () => {
    expect(isQueued(ankiFlashcard("f1", "m1", 1))).toBe(true);
  });

  it("is true for a flashcard changed since it was delivered", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 10,
      updatedAtMs: 11,
    });
    expect(isQueued(flashcard)).toBe(true);
  });

  it("is false for a flashcard delivered as it now is", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, { sentAtMs: 10 });
    expect(isQueued(flashcard)).toBe(false);
  });
});
