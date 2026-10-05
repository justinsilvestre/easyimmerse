/** The attribute on the root element of one dictionary's content, to which that dictionary's stylesheet is confined. */
export const scopeAttribute = "data-dictionary-scope";

/** Prefixes the class names of dictionary markup, so that they cannot collide with the app's own classes. */
export const classPrefix = "dict-";

/** Prefixes the custom properties of dictionary stylesheets, so that they cannot override the app's own. */
export const customPropertyPrefix = "--dict-";

/** Returns the class attribute that dictionary markup's `class` becomes when rendered, or undefined when it names no class. */
export function dictionaryClassName(
  className: string | null,
): string | undefined {
  const names = className?.split(/[ \t\n\f\r]+/).filter(Boolean) ?? [];
  return names.length > 0
    ? names.map((name) => classPrefix + name).join(" ")
    : undefined;
}
