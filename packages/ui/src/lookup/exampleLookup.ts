import type { LookupEntry } from "./lookupState.ts";

export const exampleEntries: readonly LookupEntry[] = [
  {
    term: "fressen",
    reading: null,
    definitions: [
      "to eat (of an animal); to devour",
      "(colloquial, of a person) to gobble, to wolf down",
      "(figurative) to consume, to eat up (fuel, resources)",
    ],
    tags: ["verb", "strong"],
    dictionaryTitle: "German-English Wiktionary",
  },
  {
    term: "fressen",
    reading: null,
    definitions: [
      "(von Tieren) Nahrung zu sich nehmen",
      "(umgangssprachlich, von Menschen) gierig und viel essen",
    ],
    tags: ["Verb"],
    dictionaryTitle: "DWDS Kernwortschatz",
  },
];
