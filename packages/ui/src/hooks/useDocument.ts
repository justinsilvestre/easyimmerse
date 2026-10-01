import {
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
} from "@easyimmerse/backend";
import { selectReader } from "@easyimmerse/state";
import type { Document, DocumentFormat, MediaFile } from "@easyimmerse/types";
import { useEffect } from "react";
import { describeBackendError } from "../describeBackendError.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Parses a document media file into chapters. The server reads a file on disk by its path.
 * A file stored in the browser is sent as bytes once the store holds them.
 */
export function useDocument(media: MediaFile): {
  document: Document | null;
  error: string | null;
} {
  const fromPath = useLocalDocument(media);
  const fromBytes = useStoredDocument(media);
  const parsed = media.source.kind === "path" ? fromPath : fromBytes;
  return {
    document: parsed.data ?? null,
    error:
      parsed.error === undefined ? null : describeBackendError(parsed.error),
  };
}

function useLocalDocument(media: MediaFile) {
  const [parseLocalDocument, result] = useParseLocalDocumentMutation();
  const path = media.source.kind === "path" ? media.source.path : null;
  useEffect(() => {
    if (path !== null)
      parseLocalDocument({ path, format: guessDocumentFormat(media.name) });
  }, [path, media.name, parseLocalDocument]);
  return result;
}

function useStoredDocument(media: MediaFile) {
  const [parseDocument, result] = useParseDocumentMutation();
  const stored = useAppSelector((state) => selectReader(state).documentBytes);
  const bytes = stored?.mediaId === media.id ? stored.bytes : null;
  useEffect(() => {
    if (bytes === null) return;
    const format = guessDocumentFormat(media.name);
    parseDocument({
      bytes,
      format,
      contentType: contentTypes[format ?? "none"],
    });
  }, [bytes, media.name, parseDocument]);
  return result;
}

const contentTypes = {
  epub: "application/epub+zip",
  plain_text: "text/plain",
  none: "application/octet-stream",
};

function guessDocumentFormat(name: string): DocumentFormat | null {
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "epub") return "epub";
  if (extension === "txt" || extension === "md") return "plain_text";
  return null;
}
