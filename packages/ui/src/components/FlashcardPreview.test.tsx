import type { FlashcardSettings } from "@easyimmerse/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlashcardPreview } from "./FlashcardPreview.tsx";

afterEach(cleanup);

function renderPreview(changes: Partial<FlashcardSettings>) {
  render(
    <FlashcardPreview
      targetLanguage="en"
      translationLanguage="de"
      settings={{
        included_fields: ["word", "context"],
        default_tags: [],
        tag_with_media_name: false,
        use_tts_when_no_audio: false,
        ...changes,
      }}
    />,
  );
}

const listFieldCaptions = () =>
  screen.getAllByRole("term").map((term) => term.textContent);

describe("FlashcardPreview", () => {
  it("shows an included field", () => {
    renderPreview({ included_fields: ["word", "word_pronunciation"] });
    expect(screen.queryByText("/kæt/")).not.toBeNull();
  });

  it("hides an excluded field", () => {
    renderPreview({ included_fields: ["word"] });
    expect(screen.queryByText("/kæt/")).toBeNull();
  });

  it("shows the fields in canonical order", () => {
    renderPreview({ included_fields: ["screenshot", "l1_definition", "word"] });
    expect(listFieldCaptions()).toEqual([
      "Word",
      "Definition in your language",
      "Screenshot",
    ]);
  });

  it("shows the default tags", () => {
    renderPreview({ default_tags: ["sitcom"] });
    expect(screen.queryByText("sitcom")).not.toBeNull();
  });

  it("shows a media name tag when cards are tagged with it", () => {
    renderPreview({ tag_with_media_name: true });
    expect(screen.queryByText("Episode_1")).not.toBeNull();
  });

  it("leaves out the media name tag otherwise", () => {
    renderPreview({ tag_with_media_name: false });
    expect(screen.queryByText("Episode_1")).toBeNull();
  });

  it("names the project's languages", () => {
    renderPreview({});
    expect(
      screen.queryByText(
        "Example content. Your cards will be in English, with translations in German.",
      ),
    ).not.toBeNull();
  });

  it("leaves the languages unnamed until a target language is chosen", () => {
    render(
      <FlashcardPreview
        targetLanguage=""
        translationLanguage="de"
        settings={{
          included_fields: ["word"],
          default_tags: [],
          tag_with_media_name: false,
          use_tts_when_no_audio: false,
        }}
      />,
    );
    expect(screen.queryByText("Example content.")).not.toBeNull();
  });

  it("explains when no fields are included", () => {
    renderPreview({ included_fields: [] });
    expect(screen.queryByText(/no fields/i)).not.toBeNull();
  });
});
