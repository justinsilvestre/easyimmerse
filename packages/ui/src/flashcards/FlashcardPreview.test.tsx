import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  describe("in a plain-text field", () => {
    it("keeps each line break", () => {
      renderPreview({
        content: {
          ...exampleFlashcard,
          text_context_translation: "The dog wants to eat.\nIt is hungry.",
        },
      });
      expect(screen.getByText(/The dog wants to eat\./).innerHTML).toBe(
        "The dog wants to eat.<br>It is hungry.",
      );
    });

    it("leaves out the blank lines around the text", () => {
      renderPreview({
        content: {
          ...exampleFlashcard,
          text_context_translation: " \nThe dog wants to eat.\r\n",
        },
      });
      expect(screen.getByText(/The dog wants to eat\./).innerHTML).toBe(
        "The dog wants to eat.",
      );
    });

    it("keeps the line breaks of the sentence around its word", () => {
      renderPreview({
        content: {
          ...exampleFlashcard,
          text_context: "Der Hund will fressen.\r\nEr hat Hunger.",
        },
      });
      expect(
        screen.getByText("fressen", { selector: "mark" }).parentElement
          ?.innerHTML,
      ).toMatch(/fressen<\/mark>\.<br>Er hat Hunger\.$/);
    });
  });

  describe("when the card has sentence audio", () => {
    it("offers no play button without a way to play it", () => {
      renderPreview();
      expect(
        screen.queryByRole("button", { name: "Play the sentence audio" }),
      ).toBeNull();
    });

    it("still shows that the card has audio without a way to play it", () => {
      renderPreview();
      expect(screen.getByRole("img", { name: "Sentence audio" })).toBeDefined();
    });

    it("plays the audio when its button is pressed", () => {
      const calls: string[] = [];
      renderPreview({ onPlayAudio: () => calls.push("play") });
      fireEvent.click(
        screen.getByRole("button", { name: "Play the sentence audio" }),
      );
      expect(calls).toEqual(["play"]);
    });
  });
});
