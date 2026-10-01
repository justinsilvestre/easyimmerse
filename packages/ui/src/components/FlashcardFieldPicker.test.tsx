import type { FlashcardFieldKind } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlashcardFieldPicker } from "./FlashcardFieldPicker.tsx";

afterEach(cleanup);

function renderFieldPicker(includedFields: FlashcardFieldKind[]) {
  const changes: FlashcardFieldKind[][] = [];
  render(
    <FlashcardFieldPicker
      includedFields={includedFields}
      onChange={(fields) => changes.push(fields)}
    />,
  );
  return changes;
}

const findCheckbox = (name: string) => screen.getByRole("checkbox", { name });

describe("FlashcardFieldPicker", () => {
  it("offers a checkbox for every field kind", () => {
    renderFieldPicker([]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(9);
  });

  it("checks the included fields", () => {
    renderFieldPicker(["word", "screenshot"]);
    expect(findCheckbox("Screenshot")).toHaveProperty("checked", true);
  });

  it("leaves the other fields unchecked", () => {
    renderFieldPicker(["word", "screenshot"]);
    expect(findCheckbox("Sentence")).toHaveProperty("checked", false);
  });

  it("inserts a checked field in canonical order", () => {
    const changes = renderFieldPicker(["word", "screenshot"]);
    fireEvent.click(findCheckbox("Sentence"));
    expect(changes).toEqual([["word", "context", "screenshot"]]);
  });

  it("puts fields given out of order back in canonical order", () => {
    const changes = renderFieldPicker(["screenshot", "word"]);
    fireEvent.click(findCheckbox("Sentence audio"));
    expect(changes).toEqual([["word", "context_audio", "screenshot"]]);
  });

  it("removes an unchecked field", () => {
    const changes = renderFieldPicker(["word", "context", "screenshot"]);
    fireEvent.click(findCheckbox("Sentence"));
    expect(changes).toEqual([["word", "screenshot"]]);
  });
});
