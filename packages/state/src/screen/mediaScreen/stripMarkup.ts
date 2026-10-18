/** Removes inline markup such as `<i>` from subtitle text. */
export function stripMarkup(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}
