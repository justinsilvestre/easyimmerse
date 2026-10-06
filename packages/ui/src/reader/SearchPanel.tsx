import type { Document } from "@easyimmerse/types";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Fragment, type RefObject } from "react";
import { IconButton } from "../components/IconButton.tsx";
import { pluralize } from "../components/pluralize.ts";
import { chapterLabelOf } from "./chapterTitles.ts";
import { ReaderSheet } from "./ReaderSheet.tsx";
import { excerptAround, type SearchMatch } from "./searchDocument.ts";

/**
 * Searches the whole book.
 * Results are listed by chapter with a little context; choosing one shows it in the text.
 * Enter steps to the next result and Shift+Enter to the previous.
 */
export function SearchPanel({
  document,
  query,
  matches,
  isTruncated,
  activeMatchIndex,
  onQueryChange,
  inputRef,
  onChooseMatch,
  onClose,
}: {
  document: Document;
  query: string;
  /** The search field, which takes the focus when the panel opens. */
  inputRef: RefObject<HTMLInputElement | null>;
  matches: readonly SearchMatch[];
  /** Whether the search stopped before finding every match. */
  isTruncated: boolean;
  activeMatchIndex: number | null;
  onQueryChange: (query: string) => void;
  onChooseMatch: (index: number) => void;
  onClose: () => void;
}) {
  const step = (direction: 1 | -1) => {
    if (matches.length === 0) return;
    const from = activeMatchIndex ?? (direction === 1 ? -1 : 0);
    onChooseMatch((from + direction + matches.length) % matches.length);
  };
  return (
    <ReaderSheet
      title="Search"
      placement="right"
      initialFocus={inputRef}
      onClose={onClose}
    >
      <div className="flex items-center gap-1 border-b border-line px-4 pb-3">
        <label className="flex flex-1 items-center gap-2 rounded-md border border-line-strong bg-canvas px-2 focus-within:outline-2 focus-within:outline-accent">
          <Search className="size-4 text-fg-faint" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="Search the book"
            aria-label="Search the book"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              step(event.shiftKey ? -1 : 1);
            }}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
        </label>
        <IconButton
          label="Previous result"
          disabled={matches.length === 0}
          onClick={() => step(-1)}
        >
          <ChevronUp className="size-4" />
        </IconButton>
        <IconButton
          label="Next result"
          disabled={matches.length === 0}
          onClick={() => step(1)}
        >
          <ChevronDown className="size-4" />
        </IconButton>
      </div>
      <p className="px-4 pt-2 text-xs text-fg-muted" aria-live="polite">
        {statusOf(query, matches.length, activeMatchIndex, isTruncated)}
      </p>
      <ol className="flex-1 overflow-y-auto pb-3">
        {matches.map((match, index) => {
          const isNewChapter =
            matches[index - 1]?.chapterIndex !== match.chapterIndex;
          const chapter = document.chapters[match.chapterIndex];
          const paragraph = chapter?.paragraphs[match.paragraphIndex] ?? "";
          const excerpt = excerptAround(paragraph, match.start, match.end);
          return (
            <Fragment
              key={`${match.chapterIndex}:${match.paragraphIndex}:${match.start}`}
            >
              {isNewChapter && (
                <li className="sticky top-0 bg-surface px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-fg-faint uppercase">
                  {chapterLabelOf(document, match.chapterIndex)}
                </li>
              )}
              <li>
                <button
                  type="button"
                  aria-current={index === activeMatchIndex || undefined}
                  onClick={() => onChooseMatch(index)}
                  className={clsx(
                    "w-full px-4 py-2 text-left text-sm text-fg-soft hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    index === activeMatchIndex && "bg-accent-soft",
                  )}
                >
                  {excerpt.before}
                  <mark className="rounded-sm bg-highlight text-inherit">
                    {excerpt.match}
                  </mark>
                  {excerpt.after}
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </ReaderSheet>
  );
}

function statusOf(
  query: string,
  count: number,
  activeIndex: number | null,
  isTruncated: boolean,
): string {
  if (query.trim() === "")
    return "Searches the whole book, ignoring capitals and accents.";
  if (count === 0) return `No results for “${query.trim()}”.`;
  if (activeIndex !== null)
    return `${activeIndex + 1} of ${count}${isTruncated ? "+" : ""}`;
  return isTruncated
    ? `Showing the first ${count} results`
    : pluralize(count, "result");
}
