import { type BrowserFileRegistry, documentFormatOf } from "@easyimmerse/state";
import type { Document, DocumentFormat, MediaFile } from "@easyimmerse/types";

/** A book on its way to the reader. */
export type OpenedBook =
  | { status: "loading" }
  | { status: "ready"; document: Document }
  | { status: "failed"; cause: string };

/** The backend's two ways of parsing a book: from a path on the server's disk, or from the file's bytes. */
export type BookParsers = {
  parsePath: (path: string, format: DocumentFormat | null) => Promise<Document>;
  parseBytes: (
    bytes: Uint8Array,
    format: DocumentFormat | null,
  ) => Promise<Document>;
};

const failureSentences: Record<string, string> = {
  OFFLINE:
    "This file lies on a computer's disk, and only the easyImmerse server can read it.",
  400: "The file could not be read as an ebook or a text file.",
  403: "This server does not allow reading files from its own disk.",
  404: "The file was not found. It may have been moved or deleted.",
};

/**
 * Parses an ebook or a text file from wherever the media file says it lives: a path the server reads, or a file the browser holds.
 * A failure comes back as a plain sentence rather than a rejection.
 */
export async function openBook(
  mediaFile: MediaFile,
  registry: BrowserFileRegistry<File> | null,
  parsers: BookParsers,
): Promise<OpenedBook> {
  const format = documentFormatOf(mediaFile.name);
  const { source } = mediaFile;
  if (source.kind === "path")
    return settle(parsers.parsePath(source.path, format));
  if (registry === null)
    return failed(
      "This file was added in a web browser, and this app cannot reach it.",
    );
  const file = registry.find(mediaFile.name, source);
  if (file === null)
    return failed(
      "This file is no longer open in the browser. Add it again to read it.",
    );
  return settle(
    file
      .arrayBuffer()
      .then((buffer) => parsers.parseBytes(new Uint8Array(buffer), format)),
  );
}

async function settle(parsing: Promise<Document>): Promise<OpenedBook> {
  try {
    return { status: "ready", document: await parsing };
  } catch (error) {
    return failed(describeFailure(error));
  }
}

function failed(cause: string): OpenedBook {
  return { status: "failed", cause };
}

/** A plain sentence for a parse request that failed, or for a file the browser could not read. */
function describeFailure(error: unknown): string {
  const { status, message } = (error ?? {}) as {
    status?: unknown;
    message?: unknown;
  };
  const known = failureSentences[String(status)];
  if (known !== undefined) return known;
  return status !== undefined && typeof message === "string"
    ? message
    : "The file could not be read.";
}
