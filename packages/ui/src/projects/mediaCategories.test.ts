import { describe, expect, it } from "vitest";
import type { MediaItem } from "./MediaList.tsx";
import { mediaCategoryLabel, mediaOfCategory } from "./mediaCategories.ts";

const media: MediaItem[] = [
  { id: "m1", name: "a.mkv", kind: "video", flashcardCount: 0 },
  { id: "m2", name: "b.mp3", kind: "audio", flashcardCount: 0 },
  { id: "m3", name: "c.epub", kind: "ebook", flashcardCount: 0 },
];

describe("mediaOfCategory", () => {
  it("keeps everything for the whole media category", () => {
    expect(mediaOfCategory(media, "all")).toHaveLength(3);
  });

  it("keeps only the files of one kind", () => {
    expect(mediaOfCategory(media, "audio").map((item) => item.id)).toEqual([
      "m2",
    ]);
  });
});

describe("mediaCategoryLabel", () => {
  it("names the whole media category Media", () => {
    expect(mediaCategoryLabel("all")).toBe("Media");
  });
});
