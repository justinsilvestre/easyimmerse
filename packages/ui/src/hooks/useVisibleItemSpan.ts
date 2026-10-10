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
    let visible: ReadonlySet<number> = new Set();
    let reported: ItemSpan | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        visible = visiblePositionsAfter(
          visible,
          entries.map((entry) => ({
            position: positions.get(entry.target) ?? 0,
            isIntersecting: entry.isIntersecting,
          })),
        );
        const span = spanOf(visible);
        if (isSameSpan(span, reported)) return;
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

/** A change the observer reported: the item at `position` came into view or left it. */
type IntersectionChange = { position: number; isIntersecting: boolean };

/** Returns the positions in view once a batch of changes applies, in order. */
export function visiblePositionsAfter(
  visible: ReadonlySet<number>,
  changes: readonly IntersectionChange[],
): ReadonlySet<number> {
  const next = new Set(visible);
  for (const { position, isIntersecting } of changes) {
    if (isIntersecting) next.add(position);
    else next.delete(position);
  }
  return next;
}

/** The span from the smallest to the largest position, or null for none. */
export function spanOf(positions: ReadonlySet<number>): ItemSpan | null {
  if (positions.size === 0) return null;
  return { first: Math.min(...positions), last: Math.max(...positions) };
}

/** Whether two spans cover the same items. */
export function isSameSpan(a: ItemSpan | null, b: ItemSpan | null): boolean {
  return a?.first === b?.first && a?.last === b?.last;
}
