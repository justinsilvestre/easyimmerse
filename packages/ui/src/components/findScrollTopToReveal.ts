/**
 * Returns the scroll position at which the list shows the whole item while moving as little as possible,
 * or null when the item is already fully visible. The item's offsets must be relative to the list.
 */
export function findScrollTopToReveal(
  item: { offsetTop: number; offsetHeight: number },
  list: { scrollTop: number; clientHeight: number },
): number | null {
  if (item.offsetTop < list.scrollTop) return item.offsetTop;
  const itemBottom = item.offsetTop + item.offsetHeight;
  if (itemBottom > list.scrollTop + list.clientHeight)
    return itemBottom - list.clientHeight;
  return null;
}
