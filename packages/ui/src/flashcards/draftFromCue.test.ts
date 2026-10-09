import type { MediaFile, ProjectSettings } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleCues, exampleTranslationCues } from "../media/exampleCues.ts";
import { defaultProjectSettings } from "../projects/newProjectSettings.ts";
import { draftFromCue } from "./draftFromCue.ts";

const mediaFile: MediaFile = {
  id: "m1",
  project_id: "p1",
  name: "Dark S01E01.mkv",
  source: { kind: "path", path: "/videos/dark.mkv" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
};

const cue = exampleCues[2] ?? null;

function draft(
  settings: ProjectSettings = defaultProjectSettings,
  hasScreenshots = true,
  wordStart: number | null = 14,
) {
  return draftFromCue({
    word: "fressen",
    wordStart,
    cue,
    translationCue: exampleTranslationCues[2] ?? null,
    mediaFile,
    settings,
    hasScreenshots,
  });
}

describe("draftFromCue", () => {
  it("takes the cue's text as the sentence", () => {
    expect(draft().content.text_context).toBe(
      "Der Hund will fressen.\nEr hat Hunger.",
    );
  });

  it("records where in the cue the word was taken from", () => {
    expect(draft().word_start).toBe(14);
  });

  it("records no word start when the cue does not hold the word there", () => {
    expect(draft(defaultProjectSettings, true, 4).word_start).toBeNull();
  });

  it("records no word start for a word not taken from the cue", () => {
    expect(draft(defaultProjectSettings, true, null).word_start).toBeNull();
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
