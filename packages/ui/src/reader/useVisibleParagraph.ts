import { type RefCallback, useCallback, useLayoutEffect, useRef } from "react";
import { pickTopmostVisibleIndex } from "./pickTopmostVisibleIndex.ts";

export const paragraphIndexAttribute = "data-paragraph-index";

/**
 * The height of the band at the top of the scroll container in which paragraphs are not counted as visible.
 * It keeps the end of the paragraph above the top-most one from counting when a paragraph is scrolled to the top with a scroll margin smaller than this.
 */
const ignoredTopBandPixels = 48;

/**
 * Returns a ref for a scroll container holding paragraphs marked with `data-paragraph-index`.
 * While the container is mounted, `onTopmostVisible` receives the index of the top-most visible paragraph whenever the visible paragraphs change.
 * The paragraphs are found when the container mounts, so give the container a new key when its paragraphs change.
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
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const index = Number(
          entry.target.getAttribute(paragraphIndexAttribute),
        );
        // An element that only touches the edge of the screen counts as intersecting with a ratio of zero.
        if (entry.isIntersecting && entry.intersectionRatio > 0)
          visibleIndices.add(index);
        else visibleIndices.delete(index);
      }
      const topmost = pickTopmostVisibleIndex(visibleIndices);
      if (topmost !== null) onTopmostVisible(topmost);
    },
    { root: container, rootMargin: `-${ignoredTopBandPixels}px 0px 0px 0px` },
  );
  for (const paragraph of container.querySelectorAll(
    `[${paragraphIndexAttribute}]`,
  ))
    observer.observe(paragraph);
  return observer;
}
