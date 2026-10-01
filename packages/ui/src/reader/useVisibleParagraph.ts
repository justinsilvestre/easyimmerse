import { type RefCallback, useCallback, useLayoutEffect, useRef } from "react";
import { pickTopmostVisibleIndex } from "./pickTopmostVisibleIndex.ts";

export const paragraphIndexAttribute = "data-paragraph-index";

/**
 * Returns a ref for an element containing paragraphs marked with `data-paragraph-index`.
 * While that element is mounted, `onTopmostVisible` receives the index of the top-most paragraph visible on screen whenever the visible paragraphs change.
 * The paragraphs are found when the element mounts, so give the element a new key when its paragraphs change.
 * Does nothing where IntersectionObserver is unavailable.
 */
export function useVisibleParagraph(
  onTopmostVisible: (paragraphIndex: number) => void,
): RefCallback<HTMLElement> {
  const latestCallback = useRef(onTopmostVisible);
  useLayoutEffect(() => {
    latestCallback.current = onTopmostVisible;
  });
  return useCallback((container: HTMLElement | null) => {
    if (container === null || typeof IntersectionObserver === "undefined")
      return;
    const observer = observeParagraphs(container, (index) =>
      latestCallback.current(index),
    );
    return () => observer.disconnect();
  }, []);
}

function observeParagraphs(
  container: HTMLElement,
  onTopmostVisible: (paragraphIndex: number) => void,
): IntersectionObserver {
  const visibleIndices = new Set<number>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const index = Number(entry.target.getAttribute(paragraphIndexAttribute));
      // An element that only touches the edge of the screen counts as intersecting with a ratio of zero.
      if (entry.isIntersecting && entry.intersectionRatio > 0)
        visibleIndices.add(index);
      else visibleIndices.delete(index);
    }
    const topmost = pickTopmostVisibleIndex(visibleIndices);
    if (topmost !== null) onTopmostVisible(topmost);
  });
  for (const paragraph of container.querySelectorAll(
    `[${paragraphIndexAttribute}]`,
  ))
    observer.observe(paragraph);
  return observer;
}
