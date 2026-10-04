import type { RegistryDictionary } from "./DictionaryRegistryDialog.tsx";
import type { DictionaryItem } from "./dictionaryItem.ts";

export const exampleDictionaries: readonly DictionaryItem[] = [
  {
    id: "d1",
    title: "German-English Wiktionary",
    sourceLanguage: "de",
    targetLanguage: "en",
    format: "yomitan",
    entry_count: 412_380,
    isEnabled: true,
  },
  {
    id: "d2",
    title: "DWDS Kernwortschatz",
    sourceLanguage: "de",
    targetLanguage: "de",
    format: "stardict",
    entry_count: 48_120,
    isEnabled: true,
  },
  {
    id: "d3",
    title: "JMdict (Japanese-English)",
    sourceLanguage: "ja",
    targetLanguage: "en",
    format: "yomitan",
    entry_count: 203_015,
    isEnabled: false,
  },
];

export const exampleRegistry: readonly RegistryDictionary[] = [
  {
    id: "r1",
    title: "German-English Wiktionary",
    sourceLanguage: "de",
    targetLanguage: "en",
    format: "yomitan",
    sizeBytes: 38_000_000,
    isInstalled: true,
  },
  {
    id: "r2",
    title: "Duden-style frequency list",
    sourceLanguage: "de",
    targetLanguage: "de",
    format: "yomitan",
    sizeBytes: 2_100_000,
    isInstalled: false,
  },
  {
    id: "r3",
    title: "JMdict (Japanese-English)",
    sourceLanguage: "ja",
    targetLanguage: "en",
    format: "yomitan",
    sizeBytes: 54_000_000,
    isInstalled: false,
  },
  {
    id: "r4",
    title: "Kanjidic",
    sourceLanguage: "ja",
    targetLanguage: "en",
    format: "yomitan",
    sizeBytes: 4_600_000,
    isInstalled: false,
  },
  {
    id: "r5",
    title: "French-English Wiktionary",
    sourceLanguage: "fr",
    targetLanguage: "en",
    format: "yomitan",
    sizeBytes: 29_000_000,
    isInstalled: false,
  },
];
