import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { LibraryFlashcardView } from "./LibraryFlashcardView.tsx";

afterEach(cleanup);

function renderView(
  props: Partial<Parameters<typeof LibraryFlashcardView>[0]>,
) {
  return render(
    <LibraryFlashcardView
      content={exampleFlashcard}
      settings={{
        flashcard_fields: ["word"],
        flashcard_front_fields: ["word"],
      }}
      languages={{ target: "de", translation: "en" }}
      ankiFate={null}
      isConfirmingDelete={false}
      onSuspend={() => undefined}
      onAskDelete={() => undefined}
      onCancelDelete={() => undefined}
      onDelete={() => undefined}
      onClose={() => undefined}
      {...props}
    />,
  );
}

describe("LibraryFlashcardView", () => {
  describe("when the flashcard is not suspended", () => {
    it("suspends the flashcard from its Suspend button", () => {
      const onSuspend = vi.fn();
      renderView({ onSuspend });
      fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
      expect(onSuspend).toHaveBeenCalledOnce();
    });
  });

  describe("when the flashcard is suspended", () => {
    it("has no Suspend button", () => {
      renderView({ onUnsuspend: () => undefined });
      expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    });
  });

  describe("when Delete flashcard is clicked", () => {
    it("deletes nothing before the confirmation", () => {
      const onDelete = vi.fn();
      renderView({ onDelete });
      fireEvent.click(screen.getByRole("button", { name: "Delete flashcard" }));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
