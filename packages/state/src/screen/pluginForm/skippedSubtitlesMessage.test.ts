import type { PluginForm } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { transientNotice } from "../../notices/transientNotice.ts";
import {
  skippedSubtitlesEffects,
  skippedSubtitlesMessage,
} from "./skippedSubtitlesMessage.ts";

const form: PluginForm = {
  title: "Add from a video site",
  description: null,
  fields: [
    {
      id: "subtitles",
      label: "Subtitles",
      hint: null,
      control: {
        kind: "choose-many",
        options: [{ id: "en", label: "English (automatic)", hint: null }],
        chosen: ["en"],
      },
    },
  ],
  actions: [],
};
const notFetched = { id: "en", reason: "the plugin did not fetch it" };

describe("skippedSubtitlesMessage", () => {
  it("is null when no track was skipped", () => {
    expect(skippedSubtitlesMessage([], form)).toBeNull();
  });

  it("names a skipped track as the form offered it, with the reason", () => {
    expect(skippedSubtitlesMessage([notFetched], form)).toBe(
      "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
    );
  });

  it("names a track the form did not offer by its id", () => {
    expect(skippedSubtitlesMessage([notFetched], null)).toBe(
      "The subtitles “en” were not added: the plugin did not fetch it.",
    );
  });

  it("joins the messages for several tracks", () => {
    const parseFailure = { id: "ja", reason: "its file could not be parsed" };
    expect(skippedSubtitlesMessage([notFetched, parseFailure], null)).toBe(
      "The subtitles “en” were not added: the plugin did not fetch it. The subtitles “ja” were not added: its file could not be parsed.",
    );
  });
});

describe("skippedSubtitlesEffects", () => {
  it("shows no notice when no track was skipped", () => {
    expect(skippedSubtitlesEffects([], form)).toEqual([]);
  });

  it("names the skipped tracks in a notice", () => {
    expect(skippedSubtitlesEffects([notFetched], form)).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
        ),
      },
    ]);
  });
});
