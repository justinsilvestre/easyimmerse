import type { MediaFile, ProjectSettings } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { defaultProjectSettings } from "../projects/newProjectSettings.ts";
import { draftFromText } from "./draftFromText.ts";

const mediaFile: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "Die Verwandlung.epub",
  source: { kind: "path", path: "/books/die-verwandlung.epub" },
  created_at_ms: 0,
  track_selection_json: null,
};

function draft(settings: ProjectSettings = defaultProjectSettings) {
  return draftFromText({
    word: "Ungeziefer",
    sentence: "Er fand sich in ein ungeheueres Ungeziefer verwandelt.",
    mediaFile,
    settings,
  });
}

describe("draftFromText", () => {
  it("takes the clicked word", () => {
    expect(draft().content.word).toBe("Ungeziefer");
  });

  it("takes the sentence around the word as its context", () => {
    expect(draft().content.text_context).toBe(
      "Er fand sich in ein ungeheueres Ungeziefer verwandelt.",
    );
  });

  it("records the file the card was made from", () => {
    expect(draft().media_file_id).toBe("b1");
  });

  it("has no audio clip", () => {
    expect(draft().content.audio_context).toBeNull();
  });

  it("has no screenshot", () => {
    expect(draft().content.screenshot).toBeNull();
  });

  it("starts with the project's flashcard fields", () => {
    const settings: ProjectSettings = {
      ...defaultProjectSettings,
      flashcard_fields: ["word"],
    };
    expect(draft(settings).included_fields).toEqual(["word"]);
  });

  it("tags the card with the file's name when the project asks for it", () => {
    const settings = {
      ...defaultProjectSettings,
      default_tags: ["kafka"],
      tags_media_name: true,
    };
    expect(draft(settings).content.tags).toEqual(["kafka", "die-verwandlung"]);
  });

  it("gives the card only the project's tags otherwise", () => {
    const settings = {
      ...defaultProjectSettings,
      default_tags: ["kafka"],
      tags_media_name: false,
    };
    expect(draft(settings).content.tags).toEqual(["kafka"]);
  });
});
