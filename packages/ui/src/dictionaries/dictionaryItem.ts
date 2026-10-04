import type {
  DictionaryFormatKind,
  DictionarySummary,
} from "@easyimmerse/types";

export const dictionaryFormatLabels: Record<DictionaryFormatKind, string> = {
  yomitan: "Yomitan",
  stardict: "StarDict",
  mdict: "MDict",
  csv: "CSV",
};

/** A dictionary the user has added, as the dictionaries settings list it: the server's summary plus what the screen needs beyond it. */
export type DictionaryItem = DictionarySummary & {
  /** The language of the words looked up. */
  sourceLanguage: string;
  /** The language of the definitions. The same as the source language in a monolingual dictionary. */
  targetLanguage: string;
  isEnabled: boolean;
};
