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
 * to move the reader there. It follows only while the text spoken before was in view, so that it does not undo
 * a page the reader turned meanwhile; once the reader comes back to the spoken text, it follows again.
 * `shownText` changes whenever other text is laid out, such as another chapter, so that the highlight is drawn again.
 */
export function useSpokenHighlight(
  container: RefObject<HTMLElement | null>,
  span: TextSpan | null,
  isPlaying: boolean,
  shownText: unknown,
  onFollow: (span: TextSpan) => void,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the shown text changing is what calls for drawing the highlight again.
  useEffect(() => {
    const range =
      span && container.current && rangeOfShownSpan(container.current, span);
    if (range) highlightSpoken(range);
    else clearSpokenHighlight();
  }, [container, span, shownText]);
  useEffect(() => clearSpokenHighlight, []);

  const latestFollow = useRef(onFollow);
  latestFollow.current = onFollow;
  /** The text spoken before, kept across the silences between segments. */
  const previous = useRef<TextSpan | null>(null);
  // Only a change of the spoken text calls for following; starting or pausing playback does not.
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
