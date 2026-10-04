import type { TagDefinition } from "@easyimmerse/types";

/**
 * Finds the definition of each tag an entry uses, sorted for display by the dictionary's order and then by name.
 * Only the part of a name before a colon is looked up; a tag the dictionary does not define gets an empty category.
 */
export function resolveTags(
  names: readonly string[],
  definitions: readonly TagDefinition[],
): TagDefinition[] {
  return [...new Set(names)]
    .map((name) => ({ ...findDefinition(name, definitions), name }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function findDefinition(
  name: string,
  definitions: readonly TagDefinition[],
): TagDefinition {
  const baseName = name.split(":")[0];
  return (
    definitions.find((definition) => definition.name === baseName) ?? {
      name,
      category: "",
      order: 0,
      notes: "",
      score: 0,
    }
  );
}
