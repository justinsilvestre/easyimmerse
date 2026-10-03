/** Reads the tags typed into a field as a comma-separated list, dropping blanks and repeats. */
export function parseTags(text: string): string[] {
  const tags = text.split(",").map((tag) => tag.trim());
  return [...new Set(tags.filter((tag) => tag.length > 0))];
}

/**
 * Splits the text typed into a tags field at its last comma: the part before holds finished tags,
 * and the part after is the tag still being typed.
 */
export function splitTypedTags(text: string): {
  finished: string[];
  pending: string;
} {
  const lastComma = text.lastIndexOf(",");
  if (lastComma === -1) return { finished: [], pending: text };
  return {
    finished: parseTags(text.slice(0, lastComma)),
    pending: text.slice(lastComma + 1).trimStart(),
  };
}

/** Appends the tags that are not already present. */
export function addTags(
  tags: readonly string[],
  added: readonly string[],
): string[] {
  return [...new Set([...tags, ...added])];
}
