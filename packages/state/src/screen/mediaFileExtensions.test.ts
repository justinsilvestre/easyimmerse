import { describe, expect, it } from "vitest";
import {
  documentFormatOf,
  isDocumentFileName,
  mediaFileExtensions,
} from "./mediaFileExtensions.ts";

describe("mediaFileExtensions", () => {
  it("offers ebooks and text files alongside video and audio", () => {
    expect(mediaFileExtensions).toEqual(
      expect.arrayContaining([".mp4", ".mp3", ".epub", ".txt"]),
    );
  });
});

describe("isDocumentFileName", () => {
  it("recognizes an ebook whatever the case of its extension", () => {
    expect(isDocumentFileName("Die Verwandlung.EPUB")).toBe(true);
  });

  it("recognizes a text file", () => {
    expect(isDocumentFileName("notes.txt")).toBe(true);
  });

  it("rejects a video", () => {
    expect(isDocumentFileName("episode.mkv")).toBe(false);
  });
});

describe("documentFormatOf", () => {
  it("names the EPUB format for an ebook", () => {
    expect(documentFormatOf("book.epub")).toBe("epub");
  });

  it("names the plain-text format for a text file", () => {
    expect(documentFormatOf("book.TXT")).toBe("plain_text");
  });

  it("leaves the format to detection for any other name", () => {
    expect(documentFormatOf("book")).toBeNull();
  });
});
