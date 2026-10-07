/** The number of UTF-16 code units of the character at an offset. */
export function characterLength(text: string, offset: number): number {
  return (text.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1;
}
