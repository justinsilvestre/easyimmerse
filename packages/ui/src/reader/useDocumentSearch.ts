import type { Document } from "@easyimmerse/types";
import { useMemo, useState } from "react";
import type { ReadingPosition } from "./readingPosition.ts";
import { searchDocument } from "./searchDocument.ts";

/** Holds a search query for the document and which of its matches is shown. */
export function useDocumentSearch(document: Document) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState<number | null>(null);
  const matches = useMemo(
    () => searchDocument(document, query),
    [document, query],
  );
  return {
    query,
    matchIndex,
    matchCount: matches.length,
    shownMatch: matchIndex === null ? null : (matches[matchIndex] ?? null),
    changeQuery(nextQuery: string) {
      setQuery(nextQuery);
      setMatchIndex(null);
    },
    /** Shows the next or previous match, wrapping around at the ends, and returns its position. */
    step(step: -1 | 1): ReadingPosition | null {
      if (matches.length === 0) return null;
      const nextIndex = stepMatchIndex(matchIndex, matches.length, step);
      setMatchIndex(nextIndex);
      return matches[nextIndex] ?? null;
    },
  };
}

function stepMatchIndex(
  matchIndex: number | null,
  matchCount: number,
  step: -1 | 1,
): number {
  if (matchIndex === null) return step === 1 ? 0 : matchCount - 1;
  return (matchIndex + step + matchCount) % matchCount;
}
