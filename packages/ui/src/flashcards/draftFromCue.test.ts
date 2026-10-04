import type { MediaFile, ProjectSettings } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleCues, exampleTranslationCues } from "../media/exampleCues.ts";
import { defaultProjectSettings } from "../projects/newProjectSettings.ts";
import { cueForFlashcard, draftFromCue } from "./draftFromCue.ts";

const mediaFile: MediaFile = {
  id: "m1",
  project_id: "p1",
  name: "Dark S01E01.mkv",
  source: { kind: "path", path: "/videos/dark.mkv" },
  created_at_ms: 0,
  track_selection_json: null,
};

const cue = exampleCues[2] ?? null;

function draft(
  settings: ProjectSettings = defaultProjectSettings,
  hasScreenshots = true,
) {
  return draftFromCue({
    word: "fressen",
    cue,
    translationCue: exampleTranslationCues[2] ?? null,
    mediaFile,
    settings,
    hasScreenshots,
  });
}

describe("cueForFlashcard", () => {
  it("takes the cue shown at the time", () => {
    expect(cueForFlashcard(exampleCues, 6_000)?.index).toBe(3);
  });

  it("takes the last cue before a pause", () => {
    expect(cueForFlashcard(exampleCues, 8_400)?.index).toBe(3);
  });

  it("finds none before the first cue", () => {
    expect(cueForFlashcard(exampleCues, 100)).toBeNull();
  });
});

describe("draftFromCue", () => {
  it("takes the cue's text as the sentence", () => {
    expect(draft().content.text_context).toBe(
      "Der Hund will fressen.\nEr hat Hunger.",
    );
  });

  it("takes the translation cue's text as the sentence translation", () => {
    expect(draft().content.text_context_translation).toBe(
      "The dog wants to eat.\nIt is hungry.",
    );
  });

  it("clips the audio to the cue", () => {
    expect(draft().content.audio_context).toEqual({
      start_ms: 5400,
      end_ms: 8200,
    });
  });

  it("takes the screenshot from the middle of the cue", () => {
    expect(draft().content.screenshot).toEqual({ at_ms: 6800 });
  });

  it("leaves the screenshot out when the media file has no screenshots", () => {
    expect(draft(defaultProjectSettings, false).content.screenshot).toBeNull();
  });

  it("tags the card with the media file's name when the settings say so", () => {
    expect(draft().content.tags).toEqual(["dark-s01e01"]);
  });

  it("adds the project's default tags", () => {
    expect(
      draft({ ...defaultProjectSettings, default_tags: ["tv"] }).content.tags,
    ).toEqual(["tv", "dark-s01e01"]);
  });

  it("includes the fields of the project's settings", () => {
    expect(draft().included_fields).toEqual(
      defaultProjectSettings.flashcard_fields,
    );
  });
});
