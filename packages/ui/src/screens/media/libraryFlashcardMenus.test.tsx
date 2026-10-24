import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import { savedFlashcard } from "../../testSupport/renderMediaScreen.tsx";
import { libraryFlashcardMenusOf } from "./libraryFlashcardMenus.tsx";

const fromLibrary = (changes: Partial<Flashcard> = {}): Flashcard => ({
  ...savedFlashcard,
  cue_index: 2,
  is_from_library: true,
  ...changes,
});

const handlers = () => ({
  onSuspend: vi.fn(),
  onUnsuspend: vi.fn(),
  onAskDelete: vi.fn(),
});

const labelsOf = (flashcard: Flashcard) =>
  libraryFlashcardMenusOf([flashcard], handlers())
    .get(2)
    ?.map(({ label }) => label);

describe("libraryFlashcardMenusOf", () => {
  it("offers to suspend or delete a flashcard made from the library", () => {
    expect(labelsOf(fromLibrary())).toEqual(["Suspend", "Delete flashcard"]);
  });

  it("offers to unsuspend a suspended one", () => {
    expect(labelsOf(fromLibrary({ is_suspended: true }))).toEqual([
      "Unsuspend",
      "Delete flashcard",
    ]);
  });

  it("gives no menu to a flashcard made elsewhere", () => {
    expect(labelsOf(fromLibrary({ is_from_library: false }))).toBeUndefined();
  });

  it("suspends the flashcard from its Suspend item", () => {
    const flashcard = fromLibrary();
    const given = handlers();
    libraryFlashcardMenusOf([flashcard], given).get(2)?.[0]?.onSelect();
    expect(given.onSuspend).toHaveBeenCalledWith(flashcard);
  });

  it("asks to delete the flashcard from its Delete flashcard item", () => {
    const flashcard = fromLibrary();
    const given = handlers();
    libraryFlashcardMenusOf([flashcard], given).get(2)?.[1]?.onSelect();
    expect(given.onAskDelete).toHaveBeenCalledWith(flashcard);
  });
});
