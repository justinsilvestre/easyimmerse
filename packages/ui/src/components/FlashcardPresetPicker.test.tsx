import type { FlashcardFieldKind, FlashcardPreset } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { FlashcardPresetPicker } from "./FlashcardPresetPicker.tsx";

afterEach(cleanup);

function renderPresetPicker(includedFields: readonly FlashcardFieldKind[]) {
  const chosen: FlashcardPreset[] = [];
  render(
    <FlashcardPresetPicker
      includedFields={includedFields}
      onPresetChosen={(preset) => chosen.push(preset)}
    />,
  );
  return chosen;
}

const findRadio = (name: string) => screen.getByRole("radio", { name });

describe("FlashcardPresetPicker", () => {
  it("selects the preset that matches the included fields", () => {
    renderPresetPicker(flashcardPresetFields.beginner);
    expect(findRadio("Beginner")).toHaveProperty("checked", true);
  });

  it("selects no preset for a custom selection", () => {
    renderPresetPicker(["word", "context"]);
    expect(
      screen
        .getAllByRole("radio")
        .some((radio) => (radio as HTMLInputElement).checked),
    ).toBe(false);
  });

  it("notes when the selection is custom", () => {
    renderPresetPicker(["word", "context"]);
    expect(screen.queryByText(/does not match a preset/)).not.toBeNull();
  });

  it("reports the chosen preset", () => {
    const chosen = renderPresetPicker(flashcardPresetFields.intermediate);
    fireEvent.click(findRadio("Advanced"));
    expect(chosen).toEqual(["advanced"]);
  });
});
