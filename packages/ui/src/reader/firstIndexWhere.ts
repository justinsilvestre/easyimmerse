/**
 * Finds the first index below `count` that satisfies a predicate which, once true, stays true
 * for every later index. Returns the last index when none does.
 */
export function firstIndexWhere(
  count: number,
  predicate: (index: number) => boolean,
): number {
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (predicate(middle)) high = middle;
    else low = middle + 1;
  }
  return Math.min(low, Math.max(0, count - 1));
}
