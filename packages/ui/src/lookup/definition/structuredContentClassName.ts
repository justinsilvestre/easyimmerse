import type { StructuredElement } from "@easyimmerse/types";
import { classPrefix } from "../stylesheet/dictionaryScope.ts";

/**
 * Returns the class that Yomitan gives an element of structured content, `gloss-sc-<tag>`, prefixed like a dictionary's own classes.
 * Stylesheets written for Yomitan select elements by these classes.
 */
export function structuredContentClassName(
  tag: StructuredElement["tag"],
): string {
  return `${classPrefix}gloss-sc-${tag}`;
}
