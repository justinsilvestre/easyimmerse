import type { AvailableSubtitle } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { defaultSubtitleChoice } from "./sourceSubtitleDefaults.ts";

const offered: AvailableSubtitle[] = [
  { id: "ja", language: "ja", name: "Japanese" },
  { id: "ja-orig", language: "ja", name: "Japanese (automatic)" },
  { id: "en", language: "en", name: "English (automatic)" },
  { id: "fr", language: "fr", name: "French (automatic)" },
];

const languages = { target: "ja", translation: "en-US" };

describe("defaultSubtitleChoice", () => {
  it("picks the first track in each project language", () => {
    expect(defaultSubtitleChoice(offered, languages)).toEqual(["ja", "en"]);
  });

  it("picks one track when both languages are the same", () => {
    expect(
      defaultSubtitleChoice(offered, { target: "ja", translation: "ja" }),
    ).toEqual(["ja"]);
  });

  it("picks nothing in a language the source lacks", () => {
    expect(
      defaultSubtitleChoice(offered, { target: "de", translation: "it" }),
    ).toEqual([]);
  });

  it("skips tracks that were added already", () => {
    expect(defaultSubtitleChoice(offered, languages, ["Japanese"])).toEqual([
      "ja-orig",
      "en",
    ]);
  });

  it("matches a track by its primary subtag", () => {
    const tracks = [{ id: "en-GB", language: "en-GB", name: "English" }];
    expect(defaultSubtitleChoice(tracks, languages)).toEqual(["en-GB"]);
  });
});
