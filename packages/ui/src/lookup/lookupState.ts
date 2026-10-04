import type { KanjiResult, LookupResult } from "@easyimmerse/types";

/** What the dictionary pop-up shows for the word under the pointer or typed into its search field. */
export type LookupState =
  | { kind: "loading"; term: string }
  | {
      kind: "found";
      term: string;
      results: readonly LookupResult[];
      kanji?: readonly KanjiResult[];
    }
  | { kind: "notFound"; term: string }
  | { kind: "noDictionary"; language: string };
