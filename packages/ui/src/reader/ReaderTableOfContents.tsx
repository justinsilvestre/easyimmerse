import type { Chapter } from "@easyimmerse/types";
import clsx from "clsx";
import { formatChapterTitle } from "./formatChapterTitle.ts";

/** Lists the chapters of a document so that one can be chosen. */
export function ReaderTableOfContents({
  chapters,
  currentIndex,
  onSelect,
}: {
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (chapterIndex: number) => void;
}) {
  return (
    <nav
      aria-label="Table of contents"
      className="h-full overflow-y-auto py-4 text-sm"
    >
      <h2 className="px-4 pb-2 font-semibold text-stone-500 text-xs uppercase tracking-wider">
        Contents
      </h2>
      <ol>
        {chapters.map((chapter, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Chapters have no identity beyond their order.
          <li key={index}>
            <button
              type="button"
              aria-current={index === currentIndex ? "true" : undefined}
              className={clsx(
                "flex w-full gap-3 border-l-2 px-4 py-2 text-left hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none",
                index === currentIndex
                  ? "border-stone-800 bg-stone-100 font-medium text-stone-900"
                  : "border-transparent text-stone-600",
              )}
              onClick={() => onSelect(index)}
            >
              <span
                aria-hidden="true"
                className="w-5 shrink-0 text-right text-stone-400 tabular-nums"
              >
                {index + 1}
              </span>
              {formatChapterTitle(chapter, index)}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
