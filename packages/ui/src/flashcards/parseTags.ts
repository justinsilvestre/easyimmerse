/** Reads the tags typed into a field as a comma-separated list, dropping blanks and repeats. */
export function parseTags(text: string): string[] {
  const tags = text.split(",").map((tag) => tag.trim());
  return [...new Set(tags.filter((tag) => tag.length > 0))];
}
