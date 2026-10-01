import { createContext, useContext } from "react";
import { primaryLanguageSubtag } from "../primaryLanguageSubtag.ts";

/** Overrides the interface language, as a primary language subtag. When null, the browser's language applies. */
export const InterfaceLanguageContext = createContext<string | null>(null);

/** Returns the language of the app's interface as a primary language subtag, such as `en`. */
export function useInterfaceLanguage(): string {
  const override = useContext(InterfaceLanguageContext);
  return override ?? (primaryLanguageSubtag(navigator.language) || "en");
}
