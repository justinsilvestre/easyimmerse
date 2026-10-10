/** A place in a book: a character offset within a paragraph of a chapter. */
export type ReaderLocation = {
  chapterIndex: number;
  paragraphIndex: number;
  offset: number;
};

/** The preference under which the reading place in a book is stored. */
export function readingLocationKey(mediaFileId: string): string {
  return `readingLocation:${mediaFileId}`;
}

/** Reads a stored reading place, or returns null when none is stored or it is malformed. */
export function parseReadingLocation(
  value: string | null,
): ReaderLocation | null {
  const parsed = parseJson(value);
  if (typeof parsed !== "object" || parsed === null) return null;
  const { chapterIndex, paragraphIndex, offset } = parsed as ReaderLocation;
  return [chapterIndex, paragraphIndex, offset].every(isCount)
    ? { chapterIndex, paragraphIndex, offset }
    : null;
}

/** Whether a place lies in the same paragraph as an earlier one, if there was an earlier one. */
export function isSameParagraph(
  location: ReaderLocation,
  earlier: ReaderLocation | null | undefined,
): boolean {
  return (
    earlier != null &&
    location.chapterIndex === earlier.chapterIndex &&
    location.paragraphIndex === earlier.paragraphIndex
  );
}

function parseJson(value: string | null): unknown {
  try {
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

function isCount(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}
