import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard, exampleLanguages } from "./exampleFlashcard.ts";
import { FlashcardPreview } from "./FlashcardPreview.tsx";
import { fieldsOfPreset, frontFieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

function renderPreview(
  props: Partial<Parameters<typeof FlashcardPreview>[0]> = {},
) {
  return render(
    <FlashcardPreview
      content={exampleFlashcard}
      includedFields={fieldsOfPreset("beginner")}
      frontFields={frontFieldsOfPreset("beginner")}
      languages={exampleLanguages}
      {...props}
    />,
  );
}

describe("FlashcardPreview", () => {
  it("renders the Markdown of a definition", () => {
    renderPreview({
      content: { ...exampleFlashcard, l1_definition: "to *eat*" },
    });
    expect(screen.getByText("eat").tagName).toBe("EM");
  });

  it("names an empty definition field in its place", () => {
    renderPreview({ content: { ...exampleFlashcard, l1_definition: " " } });
    expect(screen.getByText("Definition (en)")).toBeDefined();
  });
});
