import { describe, expect, it } from "vitest";
import {
  fixtureFlashcard,
  fixtureMediaFiles,
} from "../../testSupport/fixtureResponses.ts";
import { mediaItemsOf } from "./mediaItemsOf.ts";

const { media_files: mediaFiles } = fixtureMediaFiles;

describe("mediaItemsOf", () => {
  it("calls a file with a video extension a video", () => {
    expect(mediaItemsOf(mediaFiles, [])[0]?.kind).toBe("video");
  });

  it("calls a file with an audio extension audio", () => {
    expect(mediaItemsOf(mediaFiles, [])[1]?.kind).toBe("audio");
  });

  it("counts the flashcards made from each file", () => {
    expect(
      mediaItemsOf(mediaFiles, [fixtureFlashcard]).map(
        (item) => item.flashcardCount,
      ),
    ).toEqual([1, 0]);
  });
});
