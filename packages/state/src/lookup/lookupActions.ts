import type { TimeRange } from "@easyimmerse/types";

/** A word under the pointer, with the sentence and the span of media it came from when known. */
export type WordHover = {
  word: string;
  context: string | null;
  clip: TimeRange | null;
};

/** A term that a dictionary entry refers to, with the reading of the entry it means when the reference names one. */
export type LookupReference = {
  term: string;
  reading: string | null;
};

export const lookupActions = {
  wordHovered: ({ word, context, clip }: WordHover) =>
    ({ type: "wordHovered", word, context, clip }) as const,
  lookupOpenedForTyping: () => ({ type: "lookupOpenedForTyping" }) as const,
  lookupTermTyped: (term: string) =>
    ({ type: "lookupTermTyped", term }) as const,
  lookupReferenceFollowed: ({ term, reading }: LookupReference) =>
    ({ type: "lookupReferenceFollowed", term, reading }) as const,
  lookupClosed: () => ({ type: "lookupClosed" }) as const,
};
