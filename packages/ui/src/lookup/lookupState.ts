import type { TermEntry } from "@easyimmerse/types";

/** A dictionary entry together with the dictionary it came from. */
export type LookupEntry = TermEntry & { dictionaryTitle: string };

/** What the dictionary pop-up shows for the word under the pointer or typed into its search field. */
export type LookupState =
  | { kind: "loading"; term: string }
  | { kind: "found"; term: string; entries: readonly LookupEntry[] }
  | { kind: "notFound"; term: string }
  | { kind: "noDictionary"; language: string };
