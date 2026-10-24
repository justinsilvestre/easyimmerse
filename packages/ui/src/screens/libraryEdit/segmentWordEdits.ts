import type {
  LibraryEntry,
  LibrarySegment,
  LibraryWord,
} from "@easyimmerse/types";

/** Returns an entry for a word's text with no reading and no definitions yet. */
export function blankEntry(term: string): LibraryEntry {
  return { term, reading: null, l1_definition: "", l2_definition: "" };
}

/** Tells whether a word's entry has no definition in either language, as a word the library manager has yet to define. */
export function isWithoutDefinition({ entry }: LibraryWord): boolean {
  return entry.l1_definition.trim() === "" && entry.l2_definition.trim() === "";
}

/** Returns the text of a word in its segment. */
export function wordText(segment: LibrarySegment, word: LibraryWord): string {
  return segment.text.slice(word.start, word.end);
}

/** Returns the segment's words with the word at `wordIndex` split at an offset inside it into two words with blank entries. */
export function splitWord(
  segment: LibrarySegment,
  wordIndex: number,
  offset: number,
): LibraryWord[] {
  const word = segment.words[wordIndex];
  if (!word || offset <= word.start || offset >= word.end) return segment.words;
  const left = { start: word.start, end: offset };
  const right = { start: offset, end: word.end };
  return segment.words.toSpliced(
    wordIndex,
    1,
    withBlankEntry(segment, left),
    withBlankEntry(segment, right),
  );
}

/** Returns the segment's words with the word at `wordIndex` and the one after it merged into one word with a blank entry. */
export function mergeWithNext(
  segment: LibrarySegment,
  wordIndex: number,
): LibraryWord[] {
  const [word, next] = [segment.words[wordIndex], segment.words[wordIndex + 1]];
  if (!word || !next) return segment.words;
  const merged = withBlankEntry(segment, { start: word.start, end: next.end });
  return segment.words.toSpliced(wordIndex, 2, merged);
}

/** Returns the segment's words with a new word, with a blank entry, over the text between two offsets that no word covers. */
export function addWord(
  segment: LibrarySegment,
  start: number,
  end: number,
): LibraryWord[] {
  const word = withBlankEntry(segment, { start, end });
  const before = segment.words.filter((each) => each.end <= start);
  const after = segment.words.filter((each) => each.start >= end);
  return [...before, word, ...after];
}

/** Returns the segment's words with the word at `wordIndex` given another entry. */
export function withEntry(
  segment: LibrarySegment,
  wordIndex: number,
  entry: LibraryEntry,
): LibraryWord[] {
  return segment.words.map((word, index) =>
    index === wordIndex ? { ...word, entry } : word,
  );
}

function withBlankEntry(
  segment: LibrarySegment,
  span: { start: number; end: number },
): LibraryWord {
  return {
    ...span,
    entry: blankEntry(segment.text.slice(span.start, span.end)),
  };
}
