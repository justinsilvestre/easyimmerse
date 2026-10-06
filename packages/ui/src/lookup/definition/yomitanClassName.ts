import type { StructuredElement } from "@easyimmerse/types";
import { classPrefix } from "../stylesheet/dictionaryScope.ts";

/**
 * Returns one of the classes that Yomitan gives the parts of a definition it renders, such as `gloss-link` or `gloss-image-container`, prefixed like a dictionary's own classes.
 * Stylesheets written for Yomitan select elements by these classes.
 */
export function yomitanClassName(name: string): string {
  return classPrefix + name;
}

/** Returns the class that Yomitan gives an element of structured content, `gloss-sc-<tag>`, prefixed like a dictionary's own classes. */
export function structuredContentClassName(
  tag: StructuredElement["tag"],
): string {
  return yomitanClassName(`gloss-sc-${tag}`);
}
