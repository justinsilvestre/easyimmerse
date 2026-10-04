/** Writes the inflections undone in a lookup, given outermost first, as a chain read from the dictionary form outwards. */
export function formatInflectionChain(inflections: readonly string[]): string {
  return inflections.toReversed().join(" ‹ ");
}
