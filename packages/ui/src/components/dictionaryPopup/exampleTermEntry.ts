import type { TermEntry } from "@easyimmerse/types";

/** Builds a term entry for examples, filling in the fields an example does not care about. */
export function exampleTermEntry(
  entry: Pick<TermEntry, "term" | "definitions"> & Partial<TermEntry>,
): TermEntry {
  return {
    reading: null,
    alternates: [],
    wordClasses: [],
    score: 0,
    sequence: null,
    termTags: [],
    definitionTags: [],
    ...entry,
  };
}
