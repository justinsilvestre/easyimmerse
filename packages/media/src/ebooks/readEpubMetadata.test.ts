import { describe, expect, it } from "vitest";
import { createSampleEpub } from "./createSampleEpub.ts";
import { readEpubMetadata } from "./readEpubMetadata.ts";

describe("readEpubMetadata", () => {
  it("reads the title", () => {
    expect(readEpubMetadata(createSampleEpub()).title).toBe(
      "Der Beispielroman",
    );
  });

  it("reads the language", () => {
    expect(readEpubMetadata(createSampleEpub()).language).toBe("de");
  });

  it("lists the content documents in reading order", () => {
    expect(readEpubMetadata(createSampleEpub()).contentDocumentsPaths).toEqual([
      "OEBPS/text/chapter-1.xhtml",
      "OEBPS/text/chapter-2.xhtml",
    ]);
  });
});
