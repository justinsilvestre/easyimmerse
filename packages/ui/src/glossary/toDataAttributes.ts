import type { StructuredContentData } from "@easyimmerse/types";

/** Matches the keys that make a valid attribute name. */
const attributeNameKey = /^[\w.:-]+$/;

/**
 * Turns an element's structured-content `data` into `data-sc-*` attributes, named as Yomitan names them.
 * A camel-case key becomes kebab case, so `sourceType` becomes `data-sc-source-type`.
 */
export function toDataAttributes(
  data: StructuredContentData | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter(([key]) => attributeNameKey.test(key))
      .map(([key, value]) => [`data-sc-${toKebabCase(key)}`, value]),
  );
}

function toKebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
