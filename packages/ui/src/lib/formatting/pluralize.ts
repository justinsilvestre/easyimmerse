/** Writes a count with its noun, such as `1 card` or `3 cards`. The plural defaults to the singular plus `s`. */
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
