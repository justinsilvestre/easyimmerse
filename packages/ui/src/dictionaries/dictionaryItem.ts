/** The dictionary file formats the app reads. A plugin may add others. */
export type DictionaryFormat = "yomitan" | "stardict" | "mdict" | "epwing";

export const dictionaryFormatLabels: Record<DictionaryFormat, string> = {
  yomitan: "Yomitan",
  stardict: "StarDict",
  mdict: "MDict",
  epwing: "EPWING",
};

/** A dictionary the user has added, as the dictionaries settings list it. */
export type DictionaryItem = {
  id: string;
  title: string;
  /** The language of the words looked up. */
  sourceLanguage: string;
  /** The language of the definitions. The same as the source language in a monolingual dictionary. */
  targetLanguage: string;
  format: DictionaryFormat;
  entryCount: number;
  enabled: boolean;
};
