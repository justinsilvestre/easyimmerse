import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlashcardsSummary } from "./FlashcardsSummary.tsx";

afterEach(cleanup);

function renderFlashcardsSummary(count = 128) {
  const callbacks = {
    onExportAnkiPackage: vi.fn(),
    onSetUpAnkiConnect: vi.fn(),
    onStartReview: vi.fn(),
  };
  render(<FlashcardsSummary count={count} {...callbacks} />);
  return callbacks;
}

describe("FlashcardsSummary", () => {
  it("shows how many flashcards the project has", () => {
    renderFlashcardsSummary();
    expect(screen.getByText("128 flashcards")).toBeTruthy();
  });

  it("uses the singular for one flashcard", () => {
    renderFlashcardsSummary(1);
    expect(screen.getByText("1 flashcard")).toBeTruthy();
  });

  it("says when there are no flashcards yet", () => {
    renderFlashcardsSummary(0);
    expect(screen.getByText("No flashcards yet")).toBeTruthy();
  });

  it("exports an Anki deck when Export Anki deck is clicked", () => {
    const { onExportAnkiPackage } = renderFlashcardsSummary();
    fireEvent.click(screen.getByRole("button", { name: "Export Anki deck" }));
    expect(onExportAnkiPackage).toHaveBeenCalled();
  });

  it("sets up AnkiConnect when Set up AnkiConnect is clicked", () => {
    const { onSetUpAnkiConnect } = renderFlashcardsSummary();
    fireEvent.click(screen.getByRole("button", { name: "Set up AnkiConnect" }));
    expect(onSetUpAnkiConnect).toHaveBeenCalled();
  });

  it("starts a review when Review in easyImmerse is clicked", () => {
    const { onStartReview } = renderFlashcardsSummary();
    fireEvent.click(
      screen.getByRole("button", { name: "Review in easyImmerse" }),
    );
    expect(onStartReview).toHaveBeenCalled();
  });
});
