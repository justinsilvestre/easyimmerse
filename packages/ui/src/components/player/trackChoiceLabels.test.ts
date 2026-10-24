import { describe, expect, it } from "vitest";
import type { TrackChoice } from "./trackChoiceLabels.ts";
import { trackLabels } from "./trackChoiceLabels.ts";

const track = (overrides: Partial<TrackChoice>): TrackChoice => ({
  streamIndex: 1,
  language: null,
  title: null,
  format: "AAC stereo",
  isDefault: false,
  ...overrides,
});

describe("trackLabels", () => {
  it("joins the language and the title", () => {
    expect(
      trackLabels([track({ language: "ja", title: "Commentary" })]),
    ).toEqual(["Japanese · Commentary"]);
  });

  it("uses the language alone when there is no title", () => {
    expect(trackLabels([track({ language: "de" })])).toEqual(["German"]);
  });

  it("numbers tracks with neither language nor title by position", () => {
    expect(trackLabels([track({}), track({})])).toEqual(["Track 1", "Track 2"]);
  });

  it("adds the position to tracks that would read the same", () => {
    expect(
      trackLabels([track({ language: "ja" }), track({ language: "ja" })]),
    ).toEqual(["Japanese (track 1)", "Japanese (track 2)"]);
  });

  it("leaves distinct tracks unnumbered beside duplicates", () => {
    expect(
      trackLabels([
        track({ language: "ja" }),
        track({ language: "en" }),
        track({ language: "ja" }),
      ]),
    ).toEqual(["Japanese (track 1)", "English", "Japanese (track 3)"]);
  });
});
