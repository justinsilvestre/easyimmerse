import type { Chapter } from "@easyimmerse/types";
import clsx from "clsx";
import { memo, type ReactNode } from "react";
import { paragraphAttribute } from "./textOffsets.ts";

/** A highlighted stretch of a paragraph, such as a search match. */
export type TextMark = {
  paragraphIndex: number;
  start: number;
  end: number;
  isActive: boolean;
};

/**
 * One chapter's text, set like a book page: a centered heading, then paragraphs with
 * indented first lines. Every paragraph carries its index, so positions in the text can be
 * found again after the layout changes.
 */
export const ChapterText = memo(function ChapterText({
  chapter,
  language,
  isJustified,
  marks,
}: {
  chapter: Chapter;
  language: string;
  isJustified: boolean;
  marks: readonly TextMark[];
}) {
  return (
    <article
      lang={language}
      className={clsx(
        "whitespace-pre-line [overflow-wrap:break-word]",
        isJustified && "hyphens-auto text-justify",
      )}
    >
      {chapter.title && (
        <h2 className="mt-[1.5em] mb-[2em] text-center text-[1.5em] leading-tight font-normal tracking-wide break-after-avoid">
          {chapter.title}
        </h2>
      )}
      {chapter.paragraphs.map((paragraph, index) => (
        <p
          // Paragraphs never move within a chapter, so their index is a stable key.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          {...{ [paragraphAttribute]: index }}
          className="[orphans:2] [widows:2] [&+&]:indent-[1.5em]"
        >
          {markedText(
            paragraph,
            marks.filter((mark) => mark.paragraphIndex === index),
          )}
        </p>
      ))}
    </article>
  );
});

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
