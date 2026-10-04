import type { LookupEntry } from "@easyimmerse/types";

/** What the dictionary pop-up shows for the word under the pointer or typed into its search field. */
export type LookupState =
  | { kind: "loading"; term: string }
  | { kind: "found"; term: string; entries: readonly LookupEntry[] }
  | { kind: "notFound"; term: string }
  | { kind: "noDictionary"; language: string };
