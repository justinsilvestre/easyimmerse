import type { RefObject } from "react";
import { useLayoutEffect, useState } from "react";

/** The element's current size in CSS pixels, followed as it resizes. */
export function useElementSize(ref: RefObject<HTMLElement | null>): {
  widthPx: number;
  heightPx: number;
} {
  const [size, setSize] = useState({ widthPx: 0, heightPx: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const { width, height } = element.getBoundingClientRect();
    setSize({ widthPx: width, heightPx: height });
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          widthPx: entry.contentRect.width,
          heightPx: entry.contentRect.height,
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
