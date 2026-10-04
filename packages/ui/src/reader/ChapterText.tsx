import type { Chapter } from "@easyimmerse/types";
import clsx from "clsx";
import { memo, type ReactNode } from "react";
import type { ChapterSection } from "./chapterSections.ts";
import { paragraphAttribute } from "./textOffsets.ts";

/** A highlighted stretch of a paragraph, such as a search match. */
export type TextMark = {
  paragraphIndex: number;
  start: number;
  end: number;
  isActive: boolean;
};

/**
 * One chapter's text, or one section of it, set like a book page: a centered heading, then
 * paragraphs with indented first lines. Every paragraph carries its index in the chapter, so
 * positions in the text can be found again after the layout changes.
 */
export const ChapterText = memo(function ChapterText({
  chapter,
  section,
  language,
  isJustified,
  skipsOffscreenLayout,
  marks,
}: {
  chapter: Chapter;
  /** The paragraphs to show. The whole chapter when absent. */
  section?: ChapterSection;
  language: string;
  isJustified: boolean;
  /**
   * Lets the browser skip laying out paragraphs far from the view, which speeds up long
   * chapters in a scrolling layout. Page counts in a column layout would come out wrong.
   */
  skipsOffscreenLayout: boolean;
  marks: readonly TextMark[];
}) {
  const start = section?.start ?? 0;
  const end = section?.end ?? chapter.paragraphs.length;
  return (
    <article
      lang={language}
      className={clsx(
        "whitespace-pre-line [overflow-wrap:break-word]",
        isJustified && "hyphens-auto text-justify",
      )}
    >
      {chapter.title && start === 0 && (
        <h2 className="mt-[1.5em] mb-[2em] text-center text-[1.5em] leading-tight font-normal tracking-wide break-after-avoid">
          {chapter.title}
        </h2>
      )}
      {chapter.paragraphs.slice(start, end).map((paragraph, position) => {
        const index = start + position;
        return (
          <p
            key={index}
            {...{ [paragraphAttribute]: index }}
            className={clsx(
              "[orphans:2] [widows:2] [&+&]:indent-[1.5em]",
              skipsOffscreenLayout && "[content-visibility:auto]",
            )}
            style={
              skipsOffscreenLayout
                ? {
                    containIntrinsicSize: `auto ${estimatedLinesOf(paragraph)}lh`,
                  }
                : undefined
            }
          >
            {markedText(
              paragraph,
              marks.filter((mark) => mark.paragraphIndex === index),
            )}
          </p>
        );
      })}
    </article>
  );
});

/** A rough count of characters per line, for estimating the height of paragraphs not yet laid out. */
const estimatedLineCharacters = 50;

function estimatedLinesOf(paragraph: string): number {
  return Math.max(1, Math.ceil(paragraph.length / estimatedLineCharacters));
}

function markedText(text: string, marks: readonly TextMark[]): ReactNode {
  if (marks.length === 0) return text;
  const parts: ReactNode[] = [];
  let end = 0;
  for (const mark of marks) {
    parts.push(text.slice(end, mark.start));
    parts.push(
      <mark
        key={mark.start}
        data-active-mark={mark.isActive || undefined}
        className={clsx(
          "rounded-sm text-inherit",
          mark.isActive ? "bg-highlight-strong" : "bg-highlight",
        )}
      >
        {text.slice(mark.start, mark.end)}
      </mark>,
    );
    end = mark.end;
  }
  parts.push(text.slice(end));
  return parts;
}
