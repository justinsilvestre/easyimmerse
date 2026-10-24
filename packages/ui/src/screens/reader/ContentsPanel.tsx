import type { Document } from "@easyimmerse/types";
import clsx from "clsx";
import { chapterLabelOf } from "./chapterTitles.ts";
import { ReaderSheet } from "./ReaderSheet.tsx";
import { chapterStartProgresses } from "./readingProgress.ts";

/** The table of contents: the book's chapters, with the one being read marked. */
export function ContentsPanel({
  document,
  title,
  currentChapterIndex,
  progress,
  onChooseChapter,
  onClose,
}: {
  document: Document;
  title: string;
  currentChapterIndex: number;
  /** How far through the book the reader is, from 0 to 1. */
  progress: number;
  onChooseChapter: (chapterIndex: number) => void;
  onClose: () => void;
}) {
  const starts = chapterStartProgresses(document);
  return (
    <ReaderSheet title="Contents" placement="left" onClose={onClose}>
      <div className="border-b border-line px-4 pb-3">
        <p className="truncate text-sm text-fg-muted">{title}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-fg-muted tabular-nums">
            {Math.round(progress * 100)}% read
          </span>
        </div>
      </div>
      <ol className="flex-1 overflow-y-auto py-2">
        {document.chapters.map((_, index) => {
          const isCurrent = index === currentChapterIndex;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: chapters never move within a document.
            <li key={index}>
              <button
                type="button"
                aria-current={isCurrent ? "location" : undefined}
                onClick={() => onChooseChapter(index)}
                className={clsx(
                  "flex w-full items-baseline gap-3 border-l-2 px-4 py-2.5 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                  isCurrent
                    ? "border-accent bg-accent-soft font-medium text-accent-fg"
                    : "border-transparent",
                )}
              >
                <span className="flex-1">
                  {chapterLabelOf(document, index)}
                </span>
                <span className="text-xs text-fg-faint tabular-nums">
                  {Math.round((starts[index] ?? 0) * 100)}%
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </ReaderSheet>
  );
}
