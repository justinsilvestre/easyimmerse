import type { LookupResult, TagDefinition } from "@easyimmerse/types";
import { exampleTermEntry } from "./exampleTermEntry.ts";

const wiktionaryTags: TagDefinition[] = [
  { name: "verb", category: "partOfSpeech", order: 0, notes: "Verb", score: 0 },
  { name: "noun", category: "partOfSpeech", order: 0, notes: "Noun", score: 0 },
  {
    name: "strong",
    category: "",
    order: 1,
    notes: "Strong verb: the stem vowel changes in the past tense",
    score: 0,
  },
];

/** German results from plain-text dictionaries, such as ones imported from CSV. */
export const exampleResults: readonly LookupResult[] = [
  {
    matchedText: "fressen",
    term: "fressen",
    reading: null,
    inflectionChains: [],
    definitions: [
      {
        dictionaryId: "wiktionary-de-en",
        dictionaryTitle: "German-English Wiktionary",
        entry: exampleTermEntry({
          term: "fressen",
          termTags: ["verb", "strong"],
          definitions: [
            { kind: "text", text: "to eat (of an animal); to devour" },
            {
              kind: "text",
              text: "(colloquial, of a person) to gobble, to wolf down",
            },
            {
              kind: "text",
              text: "(figurative) to consume, to eat up (fuel, resources)\nDas Auto frisst viel Benzin.",
            },
          ],
        }),
        tags: wiktionaryTags,
      },
      {
        dictionaryId: "dwds",
        dictionaryTitle: "DWDS Kernwortschatz",
        entry: exampleTermEntry({
          term: "fressen",
          definitions: [
            { kind: "text", text: "(von Tieren) Nahrung zu sich nehmen" },
            {
              kind: "text",
              text: "(umgangssprachlich, von Menschen) gierig und viel essen",
            },
          ],
        }),
        tags: [],
      },
    ],
    frequencies: [],
    pronunciations: [
      {
        dictionaryId: "wiktionary-de-ipa",
        dictionaryTitle: "Wiktionary IPA",
        reading: null,
        data: {
          kind: "ipa",
          transcriptions: [{ ipa: "ˈfʁɛsn̩", tags: [] }],
        },
      },
    ],
  },
  {
    matchedText: "fressen",
    term: "Fressen",
    reading: null,
    inflectionChains: [],
    definitions: [
      {
        dictionaryId: "wiktionary-de-en",
        dictionaryTitle: "German-English Wiktionary",
        entry: exampleTermEntry({
          term: "Fressen",
          termTags: ["noun"],
          definitions: [
            { kind: "text", text: "food or feed for animals" },
            { kind: "text", text: "(colloquial, derogatory) grub, chow" },
          ],
        }),
        tags: wiktionaryTags,
      },
    ],
    frequencies: [],
    pronunciations: [],
  },
];
