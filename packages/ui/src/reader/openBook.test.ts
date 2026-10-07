import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { Document, MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { type BookParsers, openBook } from "./openBook.ts";

const book: Document = {
  title: "Sample Book",
  language: "en",
  chapters: [{ title: null, paragraphs: ["The cat sat."] }],
};

function mediaFileAt(path: string): MediaFile {
  return {
    id: "b1",
    project_id: "p1",
    name: path.slice(path.lastIndexOf("/") + 1),
    source: { kind: "path", path },
    created_at_ms: 0,
    track_selection_json: null,
    origin: null,
  };
}

function recordingParsers(result: () => Promise<Document> = async () => book) {
  const calls: unknown[][] = [];
  const parsers: BookParsers = {
    parsePath: (...args) => {
      calls.push(["parsePath", ...args]);
      return result();
    },
    parseBytes: (bytes, format) => {
      calls.push(["parseBytes", new TextDecoder().decode(bytes), format]);
      return result();
    },
  };
  return { parsers, calls };
}

function heldFile() {
  const registry = createBrowserFileRegistry<File>();
  const file = new File(["The cat sat."], "notes.txt", { lastModified: 5 });
  const mediaFile: MediaFile = {
    ...mediaFileAt("notes.txt"),
    source: registry.register(file),
  };
  return { registry, mediaFile };
}

describe("openBook", () => {
  it("has the server parse a file on its disk, in the format its name gives", async () => {
    const { parsers, calls } = recordingParsers();
    await openBook(mediaFileAt("/books/sample.epub"), null, parsers);
    expect(calls).toEqual([["parsePath", "/books/sample.epub", "epub"]]);
  });

  it("returns the parsed book", async () => {
    const { parsers } = recordingParsers();
    expect(
      await openBook(mediaFileAt("/books/sample.epub"), null, parsers),
    ).toEqual({ status: "ready", document: book });
  });

  it("parses the bytes of a file the browser holds", async () => {
    const { parsers, calls } = recordingParsers();
    const { registry, mediaFile } = heldFile();
    await openBook(mediaFile, registry, parsers);
    expect(calls).toEqual([["parseBytes", "The cat sat.", "plain_text"]]);
  });

  it("fails for a browser file on a platform that holds none", async () => {
    const { parsers } = recordingParsers();
    const { mediaFile } = heldFile();
    expect(await openBook(mediaFile, null, parsers)).toEqual({
      status: "failed",
      cause:
        "This file was added in a web browser, and this app cannot reach it.",
    });
  });

  it("fails for a browser file that is no longer open", async () => {
    const { parsers } = recordingParsers();
    const { mediaFile } = heldFile();
    expect(
      await openBook(mediaFile, createBrowserFileRegistry<File>(), parsers),
    ).toEqual({
      status: "failed",
      cause:
        "This file is no longer open in the browser. Add it again to read it.",
    });
  });

  it("explains a file the server cannot find", async () => {
    const { parsers } = recordingParsers(() =>
      Promise.reject({ status: 404, message: "no file at the given path" }),
    );
    expect(
      await openBook(mediaFileAt("/books/gone.epub"), null, parsers),
    ).toEqual({
      status: "failed",
      cause: "The file was not found. It may have been moved or deleted.",
    });
  });

  it("explains a file that is not a readable book", async () => {
    const { parsers } = recordingParsers(() =>
      Promise.reject({ status: 400, message: "invalid zip archive" }),
    );
    expect(
      await openBook(mediaFileAt("/books/broken.epub"), null, parsers),
    ).toEqual({
      status: "failed",
      cause: "The file could not be read as an ebook or a text file.",
    });
  });

  it("explains a server that cannot be reached", async () => {
    const { parsers } = recordingParsers(() =>
      Promise.reject({ status: "NETWORK", message: "Failed to fetch" }),
    );
    expect(
      await openBook(mediaFileAt("/books/sample.epub"), null, parsers),
    ).toEqual({
      status: "failed",
      cause: "The easyImmerse server could not be reached.",
    });
  });

  it("explains a path that only the server can read when there is no server", async () => {
    const { parsers } = recordingParsers(() =>
      Promise.reject({ status: "OFFLINE", message: "no server" }),
    );
    expect(
      await openBook(mediaFileAt("/books/sample.epub"), null, parsers),
    ).toEqual({
      status: "failed",
      cause:
        "This file lies on a computer's disk, and only the easyImmerse server can read it.",
    });
  });
});
