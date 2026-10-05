import clsx from "clsx";
import { lookupTriggerAttribute } from "./lookupTrigger.ts";

const wordPattern = /\p{L}[\p{L}\p{M}\p{N}'’-]*/gu;

type TextPart = { text: string; isWord: boolean; start: number };

/** Splits text into the words a reader could look up, keeping the characters between them. `start` is each part's offset in the text. */
export function splitIntoWords(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastEnd = 0;
  for (const match of text.matchAll(wordPattern)) {
    if (match.index > lastEnd)
      parts.push({
        text: text.slice(lastEnd, match.index),
        isWord: false,
        start: lastEnd,
      });
    parts.push({ text: match[0], isWord: true, start: match.index });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < text.length)
    parts.push({ text: text.slice(lastEnd), isWord: false, start: lastEnd });
  return parts;
}

/** Removes inline markup such as `<i>` from subtitle text. */
export function stripMarkup(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

/**
 * Renders text with each word as a button, so that a word can be looked up or turned into a flashcard.
 * The handlers receive each word with its offset in the text, in UTF-16 code units.
 * The words are marked as lookup triggers, so that pressing one leaves an open dictionary pop-up open for it.
 * The text is shown as it is; strip subtitle markup with `stripMarkup` first.
 */
export function ClickableText({
  text,
  activeWord,
  onWordHover,
  onWordClick,
  onWordDoubleClick,
}: {
  text: string;
  activeWord?: string;
  onWordHover?: (word: string) => void;
  onWordClick?: (word: string, start: number) => void;
  onWordDoubleClick?: (word: string, start: number) => void;
}) {
  return (
    <span className="whitespace-pre-line">
      {splitIntoWords(text).map((part) =>
        part.isWord ? (
          <button
            key={part.start}
            type="button"
            {...{ [lookupTriggerAttribute]: "" }}
            onMouseEnter={() => onWordHover?.(part.text)}
            onFocus={() => onWordHover?.(part.text)}
            onClick={() => onWordClick?.(part.text, part.start)}
            onDoubleClick={() => onWordDoubleClick?.(part.text, part.start)}
            className={clsx(
              "rounded-sm px-px decoration-dotted underline-offset-4 hover:bg-accent-soft hover:underline focus-visible:outline-2 focus-visible:outline-accent",
              part.text === activeWord && "bg-accent-soft text-accent-fg",
            )}
          >
            {part.text}
          </button>
        ) : (
          part.text
        ),
      )}
    </span>
  );
}
