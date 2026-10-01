import type { Chapter } from "@easyimmerse/types";
import clsx from "clsx";
import type { ReactNode } from "react";
import { TokenizedText } from "../components/TokenizedText.tsx";
import { formatChapterTitle } from "./formatChapterTitle.ts";
import type { ReaderSettings } from "./readerSettings.ts";
import { paragraphIndexAttribute } from "./useVisibleParagraph.ts";

/** A word together with the paragraph it appears in. */
export type WordInContext = { word: string; context: string };

const fontSizeClassNames = {
  small: "text-base",
  medium: "text-lg",
  large: "text-2xl",
} as const;

const fontFamilyClassNames = {
  serif: "font-serif",
  sans: "font-sans",
} as const;

/** Renders one chapter of a document as a column of paragraphs whose words can be hovered and clicked. */
export function DocumentReaderChapter(props: {
  chapter: Chapter;
  chapterIndex: number;
  language: string | null;
  settings: ReaderSettings;
  highlightedParagraphIndex: number | null;
  onWordHovered: (event: WordInContext) => void;
  onWordActivated: (event: WordInContext) => void;
}) {
  return (
    <article
      lang={props.language ?? undefined}
      className={clsx(
        "mx-auto max-w-[65ch] px-6 pt-10 pb-24 sm:pt-16",
        fontSizeClassNames[props.settings.fontSize],
        fontFamilyClassNames[props.settings.fontFamily],
      )}
    >
      <h2
        tabIndex={-1}
        className="mb-[1.5em] scroll-mt-24 font-semibold text-[1.5em] text-stone-900 leading-tight focus:outline-none"
      >
        {formatChapterTitle(props.chapter, props.chapterIndex)}
      </h2>
      {props.chapter.paragraphs.map((paragraph, paragraphIndex) => (
        <p
          // biome-ignore lint/suspicious/noArrayIndexKey: Paragraphs have no identity beyond their order.
          key={paragraphIndex}
          {...{ [paragraphIndexAttribute]: paragraphIndex }}
          className="mb-[1em] scroll-mt-6 text-stone-800 leading-[1.8]"
        >
          <ParagraphText
            isHighlighted={paragraphIndex === props.highlightedParagraphIndex}
          >
            <TokenizedText
              text={paragraph}
              onWordHovered={(word) =>
                props.onWordHovered({ word, context: paragraph })
              }
              onWordActivated={(word) =>
                props.onWordActivated({ word, context: paragraph })
              }
            />
          </ParagraphText>
        </p>
      ))}
    </article>
  );
}

function ParagraphText({
  isHighlighted,
  children,
}: {
  isHighlighted: boolean;
  children: ReactNode;
}) {
  if (!isHighlighted) return children;
  return (
    <mark className="box-decoration-clone rounded-sm bg-amber-200/70 px-0.5 text-inherit">
      {children}
    </mark>
  );
}
