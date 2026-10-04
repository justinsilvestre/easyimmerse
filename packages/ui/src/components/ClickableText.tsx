import clsx from "clsx";

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

/** Renders text with each word as a button, so a word can be looked up on hover or focus and turned into a flashcard on click. */
export function ClickableText({
  text,
  activeWord,
  onWordHover,
  onWordClick,
}: {
  text: string;
  activeWord?: string;
  onWordHover?: (word: string) => void;
  onWordClick?: (word: string) => void;
}) {
  return (
    <span className="whitespace-pre-line">
      {splitIntoWords(stripMarkup(text)).map((part) =>
        part.isWord ? (
          <button
            key={part.start}
            type="button"
            onMouseEnter={() => onWordHover?.(part.text)}
            onFocus={() => onWordHover?.(part.text)}
            onClick={() => onWordClick?.(part.text)}
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
