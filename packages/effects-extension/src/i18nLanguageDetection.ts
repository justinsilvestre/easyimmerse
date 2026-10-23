/** What the extension API `i18n.detectLanguage` answers. */
type LanguageDetection = {
  isReliable: boolean;
  languages: { language: string; percentage: number }[];
};

/**
 * Builds a language detection over the extension API `i18n.detectLanguage`,
 * which answers the likeliest language of a text, or null when the browser cannot tell it reliably.
 */
export function createI18nDetectLanguage(
  detect: (text: string) => Promise<LanguageDetection>,
) {
  return async (text: string): Promise<string | null> => {
    try {
      const { isReliable, languages } = await detect(text);
      return isReliable ? (languages[0]?.language ?? null) : null;
    } catch {
      return null;
    }
  };
}
