import type { Flashcard, MediaFile } from "@easyimmerse/types";
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
    word_start: null,
    content: exampleFlashcard,
    included_fields: [],
    created_at_ms: 0,
    updated_at_ms: 0,
  };
}

function mediaFileNamed(name: string): MediaFile {
  const [video] = fixtureMediaFiles.media_files;
  if (!video) throw new Error("The fixture lists no media files.");
  return { ...video, name };
}

describe("mediaItemsOf", () => {
  it("tells audio from video by the file name", () => {
    const items = mediaItemsOf(fixtureMediaFiles.media_files, []);
    expect(items.map((item) => item.kind)).toEqual(["video", "audio"]);
  });

  it("lists an ebook or a text file as an ebook", () => {
    const items = mediaItemsOf(
      [mediaFileNamed("book.epub"), mediaFileNamed("notes.txt")],
      [],
    );
    expect(items.map((item) => item.kind)).toEqual(["ebook", "ebook"]);
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
