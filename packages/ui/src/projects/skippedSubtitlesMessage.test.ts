import { describe, expect, it } from "vitest";
import { skippedSubtitlesMessage } from "./skippedSubtitlesMessage.ts";

const offered = [{ id: "en", language: "en", name: "English (automatic)" }];
const notFetched = { id: "en", reason: "the plugin did not fetch it" };

describe("skippedSubtitlesMessage", () => {
  it("is null when no track was skipped", () => {
    expect(skippedSubtitlesMessage([], offered)).toBeNull();
  });

  it("names a skipped track as the source offered it, with the reason", () => {
    expect(skippedSubtitlesMessage([notFetched], offered)).toBe(
      "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
    );
  });

  it("names a track the source did not offer by its id", () => {
    expect(skippedSubtitlesMessage([notFetched], [])).toBe(
      "The subtitles “en” were not added: the plugin did not fetch it.",
    );
  });

  it("joins the messages for several tracks", () => {
    const parseFailure = { id: "ja", reason: "its file could not be parsed" };
    expect(skippedSubtitlesMessage([notFetched, parseFailure], [])).toBe(
      "The subtitles “en” were not added: the plugin did not fetch it. The subtitles “ja” were not added: its file could not be parsed.",
    );
  });
});
