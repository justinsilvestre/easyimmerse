import type { ItemSpan } from "@easyimmerse/state";
import { type RefObject, useEffect, useState } from "react";
import { useVisibleItemSpan } from "../hooks/useVisibleItemSpan.ts";
import { paragraphAttribute, paragraphIndexOf } from "./textOffsets.ts";

/** Marks the element that scrolls or clips the reader's text, which the text's layout components render. */
export const readerViewportAttribute = "data-reader-viewport";

/**
 * Reports to `onChange` the indexes of the paragraphs in view or within one screen of it, on either side, as the layout places them:
 * above and below in a scrolling column, or on the pages before and after in a paged layout.
 * `container` holds the text, and `shown` changes whenever other paragraphs are laid out, such as on turning to another section.
 * Reports null when the paragraphs go, and nothing where the browser cannot measure them.
 */
export function useParagraphsNearView(
  container: RefObject<HTMLElement | null>,
  isPaged: boolean,
  shown: readonly unknown[],
  onChange: (span: ItemSpan | null) => void,
): void {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: another layout, or other paragraphs, means another viewport.
  useEffect(() => {
    setViewport(
      container.current?.querySelector<HTMLElement>(
        `[${readerViewportAttribute}]`,
      ) ?? null,
    );
  }, [container, isPaged, shown]);
  useVisibleItemSpan(viewport, shown, onChange, {
    rootMargin: isPaged ? "0px 100%" : "100% 0px",
    itemsOf: (root) => [...root.querySelectorAll(`[${paragraphAttribute}]`)],
    positionOf: paragraphIndexOf,
  });
}
