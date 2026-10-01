/** A language the language picker lists, identified by its BCP 47 tag. */
export type LanguageOption = {
  code: string;
  englishName: string;
  nativeName: string;
};

/** Commonly learned languages, sorted by English name. */
export const languageOptions: readonly LanguageOption[] = [
  { code: "ar", englishName: "Arabic", nativeName: "العربية" },
  { code: "zh", englishName: "Chinese", nativeName: "中文" },
  { code: "cs", englishName: "Czech", nativeName: "Čeština" },
  { code: "da", englishName: "Danish", nativeName: "Dansk" },
  { code: "nl", englishName: "Dutch", nativeName: "Nederlands" },
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "fi", englishName: "Finnish", nativeName: "Suomi" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "de", englishName: "German", nativeName: "Deutsch" },
  { code: "el", englishName: "Greek", nativeName: "Ελληνικά" },
  { code: "he", englishName: "Hebrew", nativeName: "עברית" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "id", englishName: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it", englishName: "Italian", nativeName: "Italiano" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
  { code: "nb", englishName: "Norwegian Bokmål", nativeName: "Norsk bokmål" },
  { code: "pl", englishName: "Polish", nativeName: "Polski" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "ru", englishName: "Russian", nativeName: "Русский" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "sv", englishName: "Swedish", nativeName: "Svenska" },
  { code: "th", englishName: "Thai", nativeName: "ไทย" },
  { code: "tr", englishName: "Turkish", nativeName: "Türkçe" },
  { code: "uk", englishName: "Ukrainian", nativeName: "Українська" },
  { code: "vi", englishName: "Vietnamese", nativeName: "Tiếng Việt" },
];
