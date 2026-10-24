import { describe, expect, it } from "vitest";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import {
  automaticCoverLabel,
  isEpub,
  libraryCoverDescription,
} from "./libraryCoverText.ts";

const book = exampleLibraryItem({
  kind: "document",
  file_name: "hund.epub",
  duration_ms: null,
});

describe("libraryCoverDescription", () => {
  it("names an uploaded picture", () => {
    expect(
      libraryCoverDescription(
        exampleLibraryItem({ cover: { kind: "uploaded" } }),
      ),
    ).toBe("An uploaded picture.");
  });

  it("gives the time of a chosen frame", () => {
    const item = exampleLibraryItem({
      cover: { kind: "frame", at_ms: 12_000 },
      has_cover: true,
    });
    expect(libraryCoverDescription(item)).toBe(
      "The frame at 0:12 into the video.",
    );
  });

  it("says a video's automatic cover is taken at publishing when it is not rendered yet", () => {
    expect(
      libraryCoverDescription(exampleLibraryItem({ has_cover: false })),
    ).toBe(
      "The screenshot of the first subtitle, taken when the video is published.",
    );
  });

  it("names the cover of an EPUB file", () => {
    expect(libraryCoverDescription({ ...book, has_cover: true })).toBe(
      "The book's own cover, from its EPUB file.",
    );
  });

  it("says a book without a cover has none", () => {
    expect(libraryCoverDescription({ ...book, has_cover: false })).toBe(
      "No cover picture.",
    );
  });
});

describe("automaticCoverLabel", () => {
  it("offers nothing for an item with its automatic cover", () => {
    expect(automaticCoverLabel(exampleLibraryItem())).toBeNull();
  });

  it("offers the screenshot of a video's first subtitle", () => {
    expect(
      automaticCoverLabel(exampleLibraryItem({ cover: { kind: "uploaded" } })),
    ).toBe("Use the first subtitle's screenshot");
  });

  it("offers an EPUB file's own cover", () => {
    expect(automaticCoverLabel({ ...book, cover: { kind: "uploaded" } })).toBe(
      "Use the book's own cover",
    );
  });

  it("offers to remove the picture of an audio item", () => {
    const item = exampleLibraryItem({
      kind: "audio",
      cover: { kind: "uploaded" },
    });
    expect(automaticCoverLabel(item)).toBe("Remove the picture");
  });
});

describe("isEpub", () => {
  it("tells a plain text document from an EPUB file", () => {
    expect(isEpub({ kind: "document", file_name: "hund.txt" })).toBe(false);
  });

  it("reads the extension whatever its case", () => {
    expect(isEpub({ kind: "document", file_name: "HUND.EPUB" })).toBe(true);
  });
});
