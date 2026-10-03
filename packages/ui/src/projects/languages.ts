/** The languages offered in the project form, as BCP 47 codes with their English names. */
export const languageOptions: readonly { value: string; label: string }[] = [
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "pt",
  "ru",
  "zh",
].map((code) => ({ value: code, label: languageName(code) }));

/** Names a language in English, falling back to the code itself when the browser does not know it. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
