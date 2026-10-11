import type { Chapter } from "@easyimmerse/types";
import clsx from "clsx";
import { Fragment, memo, type ReactNode } from "react";
import type { InterlinearLine } from "./alignment/bilingualLayout.ts";
import type { ChapterSection } from "./chapterSections.ts";
import { paragraphAttribute, translationAttribute } from "./textOffsets.ts";

/** A highlighted stretch of a paragraph, such as a search match. */
export type TextMark = {
  paragraphIndex: number;
  start: number;
  end: number;
  isActive: boolean;
};

/**
 * What the chapter shows of its translation in the bilingual views, in the translation's language:
 * in the interlinear view, the translation of each passage of a paragraph after the passage;
 * in the parallel view, the paragraphs of the translation beside each paragraph.
 */
export type ChapterTranslation = { language: string } & (
  | {
      layout: "interlinear";
      linesOf: (paragraphIndex: number) => readonly InterlinearLine[];
    }
  | {
      layout: "parallel";
      paragraphsBeside: (paragraphIndex: number) => readonly string[];
    }
);

/**
 * One chapter's text, or one section of it, set like a book page: a centered heading, then paragraphs with indented first lines.
 * Every paragraph carries its index in the chapter, so that positions in the text can be found again after the layout changes.
 * With a translation, the interlinear view shows each passage's translation inside the paragraph, after the passage,
 * and the parallel view sets each paragraph beside its translation in a grid of two columns, one under the other on a narrow screen.
 * The translations are marked as such, so that the paragraph's text, as positions in it are counted, stays the paragraph's own.
 */
export const ChapterText = memo(function ChapterText({
  chapter,
  section,
  language,
  isJustified,
  skipsOffscreenLayout,
  marks,
  translation,
}: {
  chapter: Chapter;
  /** The paragraphs to show. The whole chapter when absent. */
  section?: ChapterSection;
  language: string;
  isJustified: boolean;
  /**
   * Lets the browser skip laying out paragraphs far from the view, which speeds up long chapters in a scrolling layout.
   * Page counts in a column layout would come out wrong.
   */
  skipsOffscreenLayout: boolean;
  marks: readonly TextMark[];
  /** The translation shown with the text in a bilingual view. */
  translation?: ChapterTranslation;
}) {
  const start = section?.start ?? 0;
  const end = section?.end ?? chapter.paragraphs.length;
  const paragraphs = chapter.paragraphs
    .slice(start, end)
    .map((paragraph, position) => {
      const index = start + position;
      const lines =
        translation?.layout === "interlinear" ? translation.linesOf(index) : [];
      const text = (
        <p
          key={index}
          {...{ [paragraphAttribute]: index }}
          className={clsx(
            "[orphans:2] [widows:2]",
            translation ? "mb-[0.75em]" : "[&+&]:indent-[1.5em]",
            skipsOffscreenLayout && "[content-visibility:auto]",
          )}
          style={
            skipsOffscreenLayout
              ? {
                  containIntrinsicSize: `auto ${estimatedLinesOf(paragraph) * (lines.length > 0 ? 2 : 1)}lh`,
                }
              : undefined
          }
        >
          {paragraphContent(
            paragraph,
            marks.filter((mark) => mark.paragraphIndex === index),
            lines.map((line) => ({
              at: line.at,
              node: (
                <span
                  key={`translation-${line.at}-${line.text}`}
                  {...{ [translationAttribute]: "" }}
                  lang={translation?.language}
                  className="mt-[0.15em] mb-[0.5em] block indent-0 text-[0.85em] leading-snug text-fg-muted"
                >
                  {line.text}
                </span>
              ),
            })),
          )}
        </p>
      );
      if (translation?.layout !== "parallel") return text;
      return (
        <Fragment key={index}>
          {text}
          <div
            {...{ [translationAttribute]: "" }}
            lang={translation.language}
            className="mb-[1.25em] text-fg-muted sm:mb-0"
          >
            {translation.paragraphsBeside(index).map((translated, at) => (
              // The paragraphs never change order, so their position names them.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <p key={at} className="mb-[0.75em]">
                {translated}
              </p>
            ))}
          </div>
        </Fragment>
      );
    });
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
      {translation?.layout === "parallel" ? (
        <div className="grid grid-cols-1 gap-x-[2em] sm:grid-cols-2">
          {paragraphs}
        </div>
      ) : (
        paragraphs
      )}
    </article>
  );
});

/** A rough count of characters per line, for estimating the height of paragraphs not yet laid out. */
const estimatedLineCharacters = 50;

function estimatedLinesOf(paragraph: string): number {
  return Math.max(1, Math.ceil(paragraph.length / estimatedLineCharacters));
}

/** Something shown inside a paragraph between two of its characters, such as the translation of the passage before it. */
type Insertion = { at: number; node: ReactNode };

/**
 * The paragraph's text, cut where the marks begin and end and where the insertions go, with the marked stretches highlighted.
 * A mark that spans an insertion is drawn in two parts, one on either side of it.
 */
function paragraphContent(
  text: string,
  marks: readonly TextMark[],
  insertions: readonly Insertion[],
): ReactNode {
  if (marks.length === 0 && insertions.length === 0) return text;
  const cuts = [
    ...new Set([
      0,
      text.length,
      ...marks.flatMap((mark) => [mark.start, mark.end]),
      ...insertions.map((insertion) => insertion.at),
    ]),
  ]
    .filter((at) => at >= 0 && at <= text.length)
    .sort((a, b) => a - b);
  const insertedAt = (at: number) =>
    insertions
      .filter((insertion) => insertion.at === at)
      .map(({ node }) => node);
  const parts: ReactNode[] = insertedAt(0);
  for (const [position, from] of cuts.entries()) {
    const to = cuts[position + 1];
    if (to === undefined) break;
    const piece = text.slice(from, to);
    const mark = marks.find((mark) => mark.start <= from && to <= mark.end);
    parts.push(
      mark ? (
        <mark
          key={`mark-${from}`}
          data-active-mark={mark.isActive || undefined}
          className={clsx(
            "rounded-sm text-inherit",
            mark.isActive ? "bg-highlight-strong" : "bg-highlight",
          )}
        >
          {piece}
        </mark>
      ) : (
        piece
      ),
      ...insertedAt(to),
    );
  }
  return parts;
}
