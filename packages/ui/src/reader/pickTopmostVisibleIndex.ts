/** Returns the index of the paragraph nearest the start of the text among the visible ones, or null when none is visible. */
export function pickTopmostVisibleIndex(
  visibleIndices: ReadonlySet<number>,
): number | null {
  return visibleIndices.size === 0 ? null : Math.min(...visibleIndices);
}
