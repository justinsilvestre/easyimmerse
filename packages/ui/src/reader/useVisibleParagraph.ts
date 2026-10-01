import { type RefCallback, useCallback, useLayoutEffect, useRef } from "react";
import { pickTopmostVisibleIndex } from "./pickTopmostVisibleIndex.ts";

export const paragraphIndexAttribute = "data-paragraph-index";

/** A paragraph that only reaches into this many pixels at the top of the scroll container is not counted as visible, so that the end of the previous paragraph does not win when a paragraph has just been scrolled to the top. */
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
