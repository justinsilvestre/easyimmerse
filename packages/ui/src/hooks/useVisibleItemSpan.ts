import { useEffect, useEffectEvent } from "react";

/** A run of a list's items, by their positions in it, from the first to the last. */
export type ItemSpan = { first: number; last: number };

type SpanOptions = {
  /** How far around the list an item still counts as in view, as a CSS margin, such as `100% 0px` for one list height above and below. */
  rootMargin?: string;
  /** The items to watch. The list's children by default. */
  itemsOf?: (list: HTMLElement) => Element[];
  /** An item's position. Its place among the items watched by default. */
  positionOf?: (item: Element, index: number) => number;
};

/**
 * Reports through `onChange` the span of a scrolling list's items that are in view, each time it changes,
 * and null once the list is gone. `items` are what the list shows; when they change, the list's new items are watched.
 * The list must be the element that scrolls or clips its items, for `rootMargin` to reach past its edges.
 * Where the browser cannot observe intersections, nothing is reported.
 */
export function useVisibleItemSpan(
  list: HTMLElement | null,
  items: readonly unknown[],
  onChange: ((span: ItemSpan | null) => void) | undefined,
  { rootMargin, itemsOf = childrenOf, positionOf = indexOf }: SpanOptions = {},
) {
  const report = useEffectEvent((span: ItemSpan | null) => onChange?.(span));
  const watched = useEffectEvent((root: HTMLElement) =>
    itemsOf(root).map(
      (item, index) => [item, positionOf(item, index)] as const,
    ),
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: new items mean new elements to watch.
  useEffect(() => {
    if (!list || typeof IntersectionObserver === "undefined") return;
    const positions = new Map(watched(list));
    const visible = new Set<number>();
    let reported: ItemSpan | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const position = positions.get(entry.target) ?? 0;
          if (entry.isIntersecting) visible.add(position);
          else visible.delete(position);
        }
        const span = spanOf(visible);
        if (span?.first === reported?.first && span?.last === reported?.last)
          return;
        reported = span;
        report(span);
      },
      { root: list, rootMargin },
    );
    for (const item of positions.keys()) observer.observe(item);
    return () => {
      observer.disconnect();
      report(null);
    };
  }, [list, items, rootMargin]);
}

function childrenOf(list: HTMLElement): Element[] {
  return [...list.children];
}

function indexOf(_item: Element, index: number): number {
  return index;
}

function spanOf(positions: ReadonlySet<number>): ItemSpan | null {
  if (positions.size === 0) return null;
  return { first: Math.min(...positions), last: Math.max(...positions) };
}
