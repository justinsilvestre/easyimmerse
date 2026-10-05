import {
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
} from "@easyimmerse/backend";
import type { DocumentFormat, MediaFile } from "@easyimmerse/types";
import { useEffect, useEffectEvent, useState } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { type OpenedBook, openBook } from "./openBook.ts";

const loading: OpenedBook = { status: "loading" };

/**
 * Parses the media file's ebook or text file through the backend, once per file.
 * Loading until the media file is known.
 */
export function useOpenedBook(mediaFile: MediaFile | null): OpenedBook {
  const registry = useBrowserFileRegistry();
  const [parseLocalDocument] = useParseLocalDocumentMutation();
  const [parseDocument] = useParseDocumentMutation();
  const [opened, setOpened] = useState<{ id: string; book: OpenedBook }>();
  const mediaFileId = mediaFile?.id ?? null;
  // A refetched list hands over an equal media file as a new object, which must not parse the book again.
  const open = useEffectEvent(
    () =>
      mediaFile &&
      openBook(mediaFile, registry, {
        parsePath: (path, format) =>
          parseLocalDocument({ path, format }).unwrap(),
        parseBytes: (bytes, format) =>
          parseDocument({
            bytes,
            format,
            contentType: contentTypeOf(format),
          }).unwrap(),
      }),
  );
  useEffect(() => {
    if (mediaFileId === null) return;
    let isCurrent = true;
    open()?.then((book) => {
      if (isCurrent) setOpened({ id: mediaFileId, book });
    });
    return () => {
      isCurrent = false;
    };
  }, [mediaFileId]);
  return opened?.id === mediaFileId ? opened.book : loading;
}

function contentTypeOf(format: DocumentFormat | null): string {
  if (format === "epub") return "application/epub+zip";
  if (format === "plain_text") return "text/plain";
  return "application/octet-stream";
}
