import type { TextSpan } from "@easyimmerse/types";
import { type RefObject, useEffect } from "react";
import {
  clearHighlight,
  highlightRanges,
  rangeOfShownSpan,
} from "./readerTextHighlights.ts";

/**
 * Highlights stretches of the text shown inside `container` under the name, without changing the text's markup,
 * and removes the highlight when the spans go or the text unmounts.
 * `shownText` changes whenever other text is laid out, such as another chapter or view, so that the highlight is drawn again.
 */
export function useTextHighlight(
  container: RefObject<HTMLElement | null>,
  name: string,
  spans: readonly TextSpan[],
  shownText: unknown,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the shown text changing is what calls for drawing the highlight again.
  useEffect(() => {
    const element = container.current;
    const ranges = element
      ? spans.flatMap((span) => rangeOfShownSpan(element, span) ?? [])
      : [];
    if (ranges.length > 0) highlightRanges(name, ranges);
    else clearHighlight(name);
  }, [container, name, spans, shownText]);
  useEffect(() => () => clearHighlight(name), [name]);
}
