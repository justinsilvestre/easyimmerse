import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { fixtureMediaFiles } from "../testSupport/fixtureResponses.ts";
import { mediaItemsOf } from "./mediaItemsOf.ts";

function flashcardFrom(mediaFileId: string | null): Flashcard {
  return {
    id: `f-${mediaFileId}`,
    project_id: "p1",
    media_file_id: mediaFileId,
    cue_index: null,
    content: exampleFlashcard,
    included_fields: [],
    created_at_ms: 0,
    updated_at_ms: 0,
  };
}

describe("mediaItemsOf", () => {
  it("tells audio from video by the file name", () => {
    const items = mediaItemsOf(fixtureMediaFiles.media_files, []);
    expect(items.map((item) => item.kind)).toEqual(["video", "audio"]);
  });

  it("counts the flashcards made from each file", () => {
    const items = mediaItemsOf(fixtureMediaFiles.media_files, [
      flashcardFrom("m1"),
      flashcardFrom("m1"),
      flashcardFrom(null),
    ]);
    expect(items.map((item) => item.flashcardCount)).toEqual([2, 0]);
  });
});
