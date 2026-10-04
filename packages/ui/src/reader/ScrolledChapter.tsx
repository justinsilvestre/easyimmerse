import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { firstIndexWhere } from "./firstIndexWhere.ts";
import { paragraphAt, paragraphsOf } from "./pagePositions.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import { characterRect } from "./textOffsets.ts";

/** The scroll distance that reveals or hides the toolbar. */
const directionThresholdPx = 6;

/**
 * Shows a whole chapter as one scrolling column. The reader's place is the first character
 * at the top of the view, which the column scrolls back to whenever the layout changes.
 */
export function ScrolledChapter({
  chapterIndex,
  initialLocation,
  jump,
  layoutKey,
  maxColumnWidthEm,
  onLocationChange,
  onScrollDirection,
  children,
  footer,
}: {
  chapterIndex: number;
  /** The reader's place when the text first appears. */
  initialLocation: ReaderLocation;
  jump: { location: ReaderLocation; id: number };
  layoutKey: string;
  maxColumnWidthEm: number;
  onLocationChange: (location: ReaderLocation) => void;
  onScrollDirection: (direction: "up" | "down") => void;
  children: ReactNode;
  /** Shown after the chapter's text, such as a link to the next chapter. */
  footer?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const anchor = useRef(initialLocation);
  const appliedJumpId = useRef(jump.id);
  const lastScrollTop = useRef(0);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Scroll back to the reader's place whenever the text moves. The key is what moves it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    if (appliedJumpId.current !== jump.id) {
      appliedJumpId.current = jump.id;
      anchor.current = jump.location;
    }
    if (scroller.current && content.current)
      scrollTo(scroller.current, content.current, anchor.current);
    lastScrollTop.current = scroller.current?.scrollTop ?? 0;
  }, [jump, layoutKey]);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const view = scroller.current;
      if (!view || !content.current) return;
      const delta = view.scrollTop - lastScrollTop.current;
      if (Math.abs(delta) > directionThresholdPx) {
        onScrollDirection(delta > 0 ? "down" : "up");
        lastScrollTop.current = view.scrollTop;
      }
      anchor.current = locationAtTop(view, content.current, chapterIndex);
      onLocationChange(anchor.current);
    });
  };

  return (
    <div
      ref={scroller}
      className="h-full overflow-y-auto overscroll-contain"
      onScroll={onScroll}
    >
      <div
        ref={content}
        data-chapter={chapterIndex}
        className="mx-auto px-5 pt-16 pb-12"
        style={{ maxWidth: `calc(${maxColumnWidthEm}em + 2.5rem)` }}
      >
        {children}
        {footer}
      </div>
    </div>
  );
}

/** How far below the top of the view the reader's place sits, so that the line under the toolbar counts as read. */
const topInsetPx = 64;

function scrollTo(
  view: HTMLElement,
  content: HTMLElement,
  location: ReaderLocation,
) {
  const paragraph = paragraphAt(content, location.paragraphIndex);
  if (paragraph) layOutNow(paragraph);
  const rect = paragraph && characterRect(paragraph, location.offset);
  if (!rect) {
    view.scrollTop = 0;
    return;
  }
  const isStart = location.paragraphIndex === 0 && location.offset === 0;
  view.scrollTop = isStart
    ? 0
    : view.scrollTop + rect.top - view.getBoundingClientRect().top - topInsetPx;
}

/**
 * Lays out the paragraph and the one before it, even where the browser would skip them as off
 * screen. The browser gives no positions for characters it has not laid out, and the text above
 * the reader's place must keep its height once the view moves there.
 */
function layOutNow(paragraph: HTMLElement) {
  for (const element of [paragraph, paragraph.previousElementSibling])
    if (element instanceof HTMLElement)
      element.style.contentVisibility = "visible";
}

function locationAtTop(
  view: HTMLElement,
  content: HTMLElement,
  chapterIndex: number,
): ReaderLocation {
  const top = view.getBoundingClientRect().top + topInsetPx;
  const paragraphs = paragraphsOf(content);
  const paragraphIndex = firstIndexWhere(
    paragraphs.length,
    (index) => (paragraphs[index]?.getBoundingClientRect().bottom ?? 0) > top,
  );
  const paragraph = paragraphs[paragraphIndex];
  const offset = paragraph
    ? firstIndexWhere(
        paragraph.textContent?.length ?? 0,
        (at) => (characterRect(paragraph, at)?.bottom ?? 0) > top,
      )
    : 0;
  return { chapterIndex, paragraphIndex, offset };
}
