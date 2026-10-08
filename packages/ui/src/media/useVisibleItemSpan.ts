import { useEffect, useEffectEvent } from "react";

/** A run of a list's items, by their positions in it, from the first to the last. */
export type ItemSpan = { first: number; last: number };

/**
 * Reports through `onChange` the span of a scrolling list's items that are in view, each time it changes,
 * and null once the list is gone. `items` are what the list shows; when they change, the list's new children are watched.
 * Where the browser cannot observe intersections, nothing is reported.
 */
export function useVisibleItemSpan(
  list: HTMLElement | null,
  items: readonly unknown[],
  onChange: ((span: ItemSpan | null) => void) | undefined,
) {
  const report = useEffectEvent((span: ItemSpan | null) => onChange?.(span));
  // biome-ignore lint/correctness/useExhaustiveDependencies: new items mean new children to watch.
  useEffect(() => {
    if (!list || typeof IntersectionObserver === "undefined") return;
    const children = [...list.children];
    const visible = new Set<number>();
    let reported: ItemSpan | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const position = children.indexOf(entry.target);
          if (entry.isIntersecting) visible.add(position);
          else visible.delete(position);
        }
        const span = spanOf(visible);
        if (span?.first === reported?.first && span?.last === reported?.last)
          return;
        reported = span;
        report(span);
      },
      { root: list },
    );
    for (const child of children) observer.observe(child);
    return () => {
      observer.disconnect();
      report(null);
    };
  }, [list, items]);
}

function spanOf(positions: ReadonlySet<number>): ItemSpan | null {
  if (positions.size === 0) return null;
  return { first: Math.min(...positions), last: Math.max(...positions) };
}
