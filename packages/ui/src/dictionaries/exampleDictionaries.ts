import type { DictionarySummary } from "@easyimmerse/types";
import type { RegistryDictionary } from "./DictionaryRegistryDialog.tsx";

export const exampleDictionaries: readonly DictionarySummary[] = [
  {
    id: "d1",
    title: "German-English Wiktionary",
    source_language: "de",
    target_language: "en",
    format: "yomitan",
    entry_count: 412_380,
    is_enabled: true,
  },
  {
    id: "d2",
    title: "DWDS Kernwortschatz",
    source_language: "de",
    target_language: "de",
    format: "yomitan",
    entry_count: 48_120,
    is_enabled: true,
  },
  {
    id: "d3",
    title: "JMdict (Japanese-English)",
    source_language: "ja",
    target_language: "en",
    format: "yomitan",
    entry_count: 203_015,
    is_enabled: false,
  },
];

export const exampleRegistry: readonly RegistryDictionary[] = [
  {
    id: "r1",
    title: "German-English Wiktionary",
    source_language: "de",
    target_language: "en",
    format: "yomitan",
    sizeBytes: 38_000_000,
    isInstalled: true,
  },
  {
    id: "r2",
    title: "Duden-style frequency list",
    source_language: "de",
    target_language: "de",
    format: "yomitan",
    sizeBytes: 2_100_000,
    isInstalled: false,
  },
  {
    id: "r3",
    title: "JMdict (Japanese-English)",
    source_language: "ja",
    target_language: "en",
    format: "yomitan",
    sizeBytes: 54_000_000,
    isInstalled: false,
  },
  {
    id: "r4",
    title: "Kanjidic",
    source_language: "ja",
    target_language: "en",
    format: "yomitan",
    sizeBytes: 4_600_000,
    isInstalled: false,
  },
  {
    id: "r5",
    title: "French-English Wiktionary",
    source_language: "fr",
    target_language: "en",
    format: "yomitan",
    sizeBytes: 29_000_000,
    isInstalled: false,
  },
];
