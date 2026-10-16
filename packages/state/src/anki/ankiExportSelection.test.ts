import { describe, expect, it } from "vitest";
import {
  isChangedSinceExport,
  isChangedSinceSent,
} from "./ankiExportSelection.ts";
import { ankiFlashcard } from "./ankiTestSupport.ts";

describe("isChangedSinceSent", () => {
  it("is true for an edit saved in the same millisecond as the send", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 50,
      updatedAtMs: 50,
    });
    expect(isChangedSinceSent(flashcard)).toBe(true);
  });

  it("is false for a flashcard edited before the send", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      sentAtMs: 50,
      updatedAtMs: 49,
    });
    expect(isChangedSinceSent(flashcard)).toBe(false);
  });

  it("is false for a flashcard never sent", () => {
    expect(isChangedSinceSent(ankiFlashcard("f1", "m1", 1))).toBe(false);
  });
});

describe("isChangedSinceExport", () => {
  it("is true for an edit saved in the same millisecond as the export", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 50,
      updatedAtMs: 50,
    });
    expect(isChangedSinceExport(flashcard)).toBe(true);
  });

  it("is false for a flashcard edited before the export", () => {
    const flashcard = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 50,
      updatedAtMs: 49,
    });
    expect(isChangedSinceExport(flashcard)).toBe(false);
  });

  it("is false for a flashcard never exported", () => {
    expect(isChangedSinceExport(ankiFlashcard("f1", "m1", 1))).toBe(false);
  });
});
