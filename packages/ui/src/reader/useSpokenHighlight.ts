import type { TextSpan } from "@easyimmerse/types";
import { type RefObject, useEffect, useRef } from "react";
import {
  clearSpokenHighlight,
  highlightSpoken,
  isRangeInView,
  rangeOfShownSpan,
} from "./readerSpokenHighlight.ts";

/**
 * Highlights the text being spoken while the audio the book is aligned with plays, without changing the text's markup,
 * and keeps it in view: when playback moves on to text off the page or out of the column in view, `onFollow` is called
 * to move the reader to its first span. It follows only while the text spoken before was in view, so that it does not undo
 * a page the reader turned meanwhile; once the reader comes back to the spoken text, it follows again.
 * `shownText` changes whenever other text is laid out, such as another chapter or view, so that the highlight is drawn again.
 * `spans` keeps its identity while the same text is spoken.
 */
export function useSpokenHighlight(
  container: RefObject<HTMLElement | null>,
  spans: readonly TextSpan[],
  isPlaying: boolean,
  shownText: unknown,
  onFollow: (span: TextSpan) => void,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the shown text changing is what calls for drawing the highlight again.
  useEffect(() => {
    const element = container.current;
    const ranges = element
      ? spans.flatMap((span) => rangeOfShownSpan(element, span) ?? [])
      : [];
    if (ranges.length > 0) highlightSpoken(ranges);
    else clearSpokenHighlight();
  }, [container, spans, shownText]);
  useEffect(() => clearSpokenHighlight, []);

  const latestFollow = useRef(onFollow);
  latestFollow.current = onFollow;
  /** The text spoken before, kept across the silences between segments. */
  const previous = useRef<TextSpan | null>(null);
  // Only a change of the spoken text calls for following; starting or pausing playback does not.
  const span = spans[0] ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (span === null) return;
    const before = previous.current;
    previous.current = span;
    const element = container.current;
    if (!isPlaying || element === null) return;
    if (before !== null && !isSpanInView(element, before)) return;
    if (!isSpanInView(element, span)) latestFollow.current(span);
  }, [container, span]);
}

function isSpanInView(container: HTMLElement, span: TextSpan): boolean {
  const range = rangeOfShownSpan(container, span);
  return range !== null && isRangeInView(container, range);
}
