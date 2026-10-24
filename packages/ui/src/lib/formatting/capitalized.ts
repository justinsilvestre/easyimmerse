/** Returns the text with its first letter in upper case, for a name that starts a sentence. */
export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
