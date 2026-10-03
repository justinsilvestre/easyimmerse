import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import type { FlashcardContent, FlashcardFieldKey } from "./flashcardFields.ts";
import { fieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

type OnSave = (
  content: FlashcardContent,
  fields: readonly FlashcardFieldKey[],
) => void;

function renderEditor(onSave: OnSave = () => undefined) {
  render(
    <FlashcardEditor
      initialContent={exampleFlashcard}
      initialFields={fieldsOfPreset("intermediate")}
      onSave={onSave}
      onDelete={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe("FlashcardEditor", () => {
  it("hides the fields excluded by the flashcard settings", () => {
    renderEditor();
    expect(screen.queryByLabelText("Word pronunciation")).toBeNull();
  });

  it("shows an excluded field once its add button is clicked", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Word pronunciation" }));
    expect(screen.getByLabelText("Word pronunciation")).not.toBeNull();
  });

  it("saves the edited text", () => {
    const saved: string[] = [];
    renderEditor((content) => saved.push(content.word));
    fireEvent.change(screen.getByLabelText("Word"), {
      target: { value: "Hunger" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toEqual(["Hunger"]);
  });

  it("keeps a trailing comma in the tags field, so another tag can follow", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "sample," },
    });
    expect((screen.getByLabelText("Tags") as HTMLInputElement).value).toBe(
      "sample,",
    );
  });

  it("keeps the screenshot in view after it is unchecked", () => {
    renderEditor();
    fireEvent.click(screen.getByLabelText("Include the screenshot"));
    expect(screen.getByLabelText("Include the screenshot")).not.toBeNull();
  });

  it("drops the screenshot from the saved fields when it is unchecked", () => {
    const saved: (readonly string[])[] = [];
    renderEditor((_content, fields) => saved.push(fields));
    fireEvent.click(screen.getByLabelText("Include the screenshot"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved[0]).not.toContain("screenshot");
  });
});
