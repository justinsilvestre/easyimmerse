import { describe, expect, it } from "vitest";
import { withLibraryVideo } from "../../flashcards/libraryFlashcardTestSupport.ts";
import { cachedCues } from "./cachedCues.ts";

describe("cachedCues", () => {
  it("reads a library media file's cues from its item's text", () => {
    const route = {
      screen: "media",
      projectId: "p1",
      mediaFileId: "m1",
    } as const;
    expect(
      cachedCues(withLibraryVideo, route).cues.map(({ text }) => text),
    ).toEqual(["Der Hund schläft.", "Er träumt."]);
  });
});
