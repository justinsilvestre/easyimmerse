/** Finds the language of a text, as a BCP 47 tag, or null when it cannot tell. */
export type DetectLanguage = (text: string) => Promise<string | null>;

/** The BCP 47 tag for a language that is not known. */
const undeterminedLanguage = "und";

/**
 * The language of an element of a web page: the one the nearest element around it declares in its `lang` attribute,
 * or else the one `detectLanguage` finds in its text, or else the undetermined language.
 */
export async function pageLanguageOf(
  element: Element,
  detectLanguage: DetectLanguage,
): Promise<string> {
  return (
    declaredLanguageOf(element) ??
    (await detectLanguage(element.textContent ?? "")) ??
    undeterminedLanguage
  );
}

function declaredLanguageOf(element: Element): string | null {
  return element.closest('[lang]:not([lang=""])')?.getAttribute("lang") ?? null;
}
