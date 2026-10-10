import type {
  DictionaryStylesheet,
  KanjiResult,
  LookupResult,
} from "@easyimmerse/types";

/** What the dictionary pop-up shows for the word under the pointer or typed into its search field. */
export type LookupDisplayState =
  | { kind: "loading"; term: string }
  | {
      kind: "found";
      term: string;
      results: readonly LookupResult[];
      kanji?: readonly KanjiResult[];
      /** The stylesheets of the dictionaries whose definitions `results` shows. */
      stylesheets?: readonly DictionaryStylesheet[];
    }
  | { kind: "notFound"; term: string }
  /** The lookup could not reach the dictionaries, as when no server is connected. */
  | { kind: "failed"; term: string }
  /** No dictionary covers the language. `term` is the word chosen in the text, when there is one. */
  | { kind: "noDictionary"; language: string; term?: string };
