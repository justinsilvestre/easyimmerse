import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useElementSize } from "../hooks/useElementSize.ts";
import { type PageLayout, pageLayoutOf } from "./pageLayout.ts";
import {
  locationOfPage,
  type PagedText,
  pageCountOf,
  pageOfLocation,
} from "./pagePositions.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import { readerViewportAttribute } from "./useParagraphsNearView.ts";
import { useSwipe } from "./useSwipe.ts";
import { useWheelTurns } from "./useWheelTurns.ts";

/** Turns the pages of the chapter on screen. */
export type PageTurner = { next: () => void; previous: () => void };

export type PageInfo = { page: number; pageCount: number };

/** The space between columns, and between pages, in multiples of the font size. */
const gapEm = 3;

/**
 * Lays a chapter, or a section of a long one, out in pages of one or two columns,
 * which the reader turns by keyboard, swipe, scroll wheel, or the arrows beside the page.
 * The page is found again from the reading location whenever the layout changes,
 * so that resizing the window or the text keeps the reader's place.
 */
export function PagedChapter({
  chapterIndex,
  location,
  jumpCount,
  layoutKey,
  maxColumnWidthEm,
  ref,
  onLocationChange,
  onPageChange,
  onPastEnd,
  onBeforeStart,
  children,
}: {
  chapterIndex: number;
  /** The reader's place, which the pages are turned to when they are laid out and after each jump. */
  location: ReaderLocation;
  /** Changes with each jump to `location`. */
  jumpCount: number;
  /** Changes whenever a preference that moves the text changes, such as the font size. */
  layoutKey: string;
  maxColumnWidthEm: number;
  ref?: Ref<PageTurner>;
  onLocationChange: (location: ReaderLocation) => void;
  onPageChange: (info: PageInfo) => void;
  onPastEnd: () => void;
  onBeforeStart: () => void;
  /** The chapter's text. */
  children: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const size = useElementSize(viewport);
  const fontsLoaded = useFontsLoaded();
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [view, setView] = useState({ page: 0, pageCount: 1, animates: false });
  const reportsLocation = useRef(false);

  // Measure the font to size the columns. The key and size are what make the measurement stale.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    if (!columns.current || size.width === 0) return;
    const fontPx = Number.parseFloat(
      getComputedStyle(columns.current).fontSize,
    );
    setLayout(
      pageLayoutOf(size.width, maxColumnWidthEm * fontPx, gapEm * fontPx),
    );
  }, [size, layoutKey, maxColumnWidthEm, fontsLoaded]);

  // Once the columns are laid out, count the pages and find the reader's place among them, and again after each jump.
  // The location is read here but not followed, since the chapter's own reports move it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    const text = pagedText(columns.current, layout);
    if (!text) return;
    setView({
      page: pageOfLocation(text, location),
      pageCount: pageCountOf(text),
      animates: false,
    });
  }, [layout, size.height, jumpCount]);

  const reportView = useEffectEvent((shown: typeof view) => {
    onPageChange({ page: shown.page, pageCount: shown.pageCount });
    const text = pagedText(columns.current, layout);
    if (!reportsLocation.current || !text) return;
    reportsLocation.current = false;
    onLocationChange(locationOfPage(text, shown.page, chapterIndex));
  });
  useEffect(() => reportView(view), [view]);

  const turnTo = (page: number) => {
    if (page >= view.pageCount) return onPastEnd();
    if (page < 0) return onBeforeStart();
    reportsLocation.current = true;
    setView({ ...view, page, animates: true });
  };
  const turner = {
    next: () => turnTo(view.page + 1),
    previous: () => turnTo(view.page - 1),
  };
  useImperativeHandle(ref, () => turner);
  const swipe = useSwipe(turner);
  const onWheel = useWheelTurns(turner);

  const offset = -(view.page * (layout?.stride ?? 0)) + swipe.dragX;
  return (
    <div className="group relative flex h-full justify-center px-5 md:px-16">
      <div
        ref={viewport}
        className="h-full w-full touch-pan-y"
        onWheel={onWheel}
        {...swipe.handlers}
      >
        <div
          {...{ [readerViewportAttribute]: "" }}
          className="mx-auto h-full overflow-hidden"
          style={{ width: layout?.pageWidth }}
        >
          <div
            ref={columns}
            data-chapter={chapterIndex}
            className="h-full [column-fill:auto]"
            style={{
              columnCount: layout?.columns,
              columnGap: layout?.gap,
              width: layout?.pageWidth,
              transform: `translateX(${offset}px)`,
              transition:
                view.animates && !swipe.isDragging
                  ? "transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1)"
                  : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <EdgeButton side="left" onClick={turner.previous} />
      <EdgeButton side="right" onClick={turner.next} />
    </div>
  );
}

function EdgeButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous page" : "Next page"}
      tabIndex={-1}
      onClick={(event) => {
        // The click must not reach the text beneath, which would treat it as a tap beside the words.
        event.stopPropagation();
        onClick();
      }}
      className={clsx(
        "absolute inset-y-0 hidden w-14 items-center justify-center text-fg-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg md:flex",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}

function pagedText(
  columns: HTMLElement | null,
  layout: PageLayout | null,
): PagedText | null {
  return columns && layout ? { columns, stride: layout.stride } : null;
}

/** Whether the page's web fonts have loaded, after which text takes up a different amount of space. */
function useFontsLoaded() {
  const [isLoaded, setLoaded] = useState(false);
  useEffect(() => {
    let isCurrent = true;
    document.fonts?.ready.then(() => {
      if (isCurrent) setLoaded(true);
    });
    return () => {
      isCurrent = false;
    };
  }, []);
  return isLoaded;
}
