import { primaryLanguageSubtag } from "./primaryLanguageSubtag.ts";

/** Tells whether two BCP 47 tags name the same language, comparing only their primary subtags and ignoring case. */
export function isSameLanguage(first: string, second: string): boolean {
  return primaryLanguageSubtag(first) === primaryLanguageSubtag(second);
}
