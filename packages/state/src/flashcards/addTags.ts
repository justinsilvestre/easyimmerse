/** Appends the tags that are not already present. */
export function addTags(
  tags: readonly string[],
  added: readonly string[],
): string[] {
  return [...new Set([...tags, ...added])];
}
