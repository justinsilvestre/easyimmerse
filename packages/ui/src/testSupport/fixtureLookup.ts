import type { DictionarySummary, TermEntry } from "@easyimmerse/types";

export const fixtureBilingualDictionary: DictionarySummary = {
  id: "d1",
  title: "German–English Wiktionary",
  entry_count: 412_031,
};

export const fixtureMonolingualDictionary: DictionarySummary = {
  id: "d2",
  title: "Deutsches Wörterbuch",
  entry_count: 98_456,
};

export const fixtureBilingualEntry: TermEntry = {
  term: "Katze",
  reading: "ˈkat͡sə",
  definitions: ["cat", "female cat, as opposed to a tomcat"],
  tags: ["noun", "feminine"],
};

export const fixtureMonolingualEntry: TermEntry = {
  term: "Katze",
  reading: null,
  definitions: [
    "kleines Raubtier mit weichem Fell, das als Haustier gehalten wird",
  ],
  tags: ["Substantiv"],
};

/** Lookup results for "Katze" from both fixture dictionaries. */
export const fixtureLookupResults = [
  { dictionary: fixtureBilingualDictionary, entries: [fixtureBilingualEntry] },
  {
    dictionary: fixtureMonolingualDictionary,
    entries: [fixtureMonolingualEntry],
  },
];
