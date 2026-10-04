import clsx from "clsx";
import { useState } from "react";
import type { PageInfo } from "./PagedChapter.tsx";

/** The steps of the progress slider. */
const sliderSteps = 1000;

/**
 * The reader's place in the book. A quiet line of page and percentage stays at the bottom of
 * the page; while the toolbar shows, a slider above it moves through the whole book, with a
 * tick at the start of each chapter.
 */
export function ReaderFooter({
  progress,
  pageInfo,
  chapterTitle,
  chapterStarts,
  isVisible,
  chapterTitleAt,
  onScrub,
}: {
  progress: number;
  /** The page within the chapter, in the paged layout. */
  pageInfo: PageInfo | null;
  chapterTitle: string | null;
  /** Where each chapter starts, from 0 to 1. */
  chapterStarts: readonly number[];
  isVisible: boolean;
  /** Names the chapter at a point in the book, for the slider's preview. */
  chapterTitleAt: (progress: number) => string | null;
  onScrub: (progress: number) => void;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? progress;
  const commit = () => {
    if (preview === null) return;
    onScrub(preview);
    setPreview(null);
  };
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      <div
        inert={!isVisible}
        className={clsx(
          "pointer-events-auto mx-auto mb-1 flex max-w-xl flex-col gap-1 rounded-xl border border-line bg-surface/90 px-4 pt-2 pb-1 shadow-lg backdrop-blur transition-[opacity,translate] duration-300 max-sm:mx-2",
          !isVisible && "translate-y-2 opacity-0",
        )}
      >
        <div className="relative flex h-5 items-center">
          {chapterStarts.slice(1).map((start) => (
            <span
              key={start}
              className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-line-strong"
              style={{ left: `${start * 100}%` }}
            />
          ))}
          <input
            type="range"
            aria-label="Position in the book"
            aria-valuetext={`${Math.round(shown * 100)}%`}
            min={0}
            max={sliderSteps}
            value={Math.round(shown * sliderSteps)}
            onChange={(event) =>
              setPreview(Number(event.target.value) / sliderSteps)
            }
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            className="relative w-full accent-accent"
          />
        </div>
        <p className="truncate text-center text-xs text-fg-muted">
          {preview === null
            ? chapterTitle
            : `${chapterTitleAt(preview) ?? ""} · ${Math.round(preview * 100)}%`}
        </p>
      </div>
      <div className="flex justify-between px-5 pb-2 text-xs text-fg-faint tabular-nums md:px-16">
        <span>
          {pageInfo
            ? `Page ${pageInfo.page + 1} of ${pageInfo.pageCount}`
            : chapterTitle}
        </span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </footer>
  );
}
