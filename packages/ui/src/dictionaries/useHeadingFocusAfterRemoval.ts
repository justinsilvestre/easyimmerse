import { useEffect, useRef } from "react";

/**
 * Returns a ref for the page's heading, and moves focus to it once a dictionary seen being removed has left the list,
 * since the row that held focus is gone.
 */
export function useHeadingFocusAfterRemoval(
  dictionaryIds: readonly string[],
  removingIds: readonly string[],
) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const seenRemoving = useRef(new Set<string>());
  useEffect(() => {
    const seen = seenRemoving.current;
    for (const id of removingIds) seen.add(id);
    const gone = [...seen].filter((id) => !dictionaryIds.includes(id));
    for (const id of gone) seen.delete(id);
    if (gone.length > 0) headingRef.current?.focus();
  }, [dictionaryIds, removingIds]);
  return headingRef;
}
