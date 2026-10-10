/** Tells whether two lists hold the same items in the same order, compared by reference. */
export function haveSameItems<T>(
  first: readonly T[],
  second: readonly T[],
): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  );
}
