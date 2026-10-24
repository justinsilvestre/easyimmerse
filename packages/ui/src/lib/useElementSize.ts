import type { RefObject } from "react";
import { useLayoutEffect, useState } from "react";

type ElementSize = { width: number; height: number };

/** The element's current size in CSS pixels, borders included, followed as it resizes. */
export function useElementSize(
  ref: RefObject<HTMLElement | null>,
): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const measure = () => setSize(sizeOf(element));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function sizeOf(element: HTMLElement): ElementSize {
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
}
