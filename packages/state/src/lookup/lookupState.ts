import type { TimeRange } from "@easyimmerse/types";

/** The dictionary pop-up. */
export type LookupState =
  | { kind: "closed" }
  | {
      kind: "open";
      term: string;
      /** The sentence the term appeared in, when known. */
      context: string | null;
      /** The span of media the term was spoken in, which the player repeats while the pop-up is open. */
      clip: TimeRange | null;
      /** Whether the user is typing the term rather than hovering a word. */
      typed: boolean;
      /** The reading whose entries come first, when the term came from a dictionary's cross-reference that names one. */
      preferredReading: string | null;
      /** Whether media was playing when the pop-up opened, so that it plays again once the pop-up closes. */
      resumePlaybackOnClose: boolean;
    };

export const closedLookup: LookupState = { kind: "closed" };

export function willResumeOnClose(lookup: LookupState): boolean {
  return lookup.kind === "open" && lookup.resumePlaybackOnClose;
}
