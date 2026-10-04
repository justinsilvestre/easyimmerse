import type { LookupEntry } from "@easyimmerse/types";

export const exampleEntries: readonly LookupEntry[] = [
  {
    dictionary_id: "d1",
    dictionary_title: "German-English Wiktionary",
    entry: {
      term: "fressen",
      reading: null,
      definitions: [
        "to eat (of an animal); to devour",
        "(colloquial, of a person) to gobble, to wolf down",
        "(figurative) to consume, to eat up (fuel, resources)",
      ],
      tags: ["verb", "strong"],
    },
  },
  {
    dictionary_id: "d2",
    dictionary_title: "DWDS Kernwortschatz",
    entry: {
      term: "fressen",
      reading: null,
      definitions: [
        "(von Tieren) Nahrung zu sich nehmen",
        "(umgangssprachlich, von Menschen) gierig und viel essen",
      ],
      tags: ["Verb"],
    },
  },
];
