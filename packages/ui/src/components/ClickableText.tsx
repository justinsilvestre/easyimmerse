import clsx from "clsx";
import { lookupTriggerAttribute } from "./lookupTrigger.ts";
import { useWordGestures, type WordGestures } from "./useWordGestures.ts";

/** A letter of a script written without spaces between words: Chinese characters, hiragana and katakana, with marks such as ー. */
const unspacedLetter = String.raw`(?=[\p{L}\p{M}])[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}]`;

/** A letter, mark, digit or joining character of any other script. */
const spacedLetter = String.raw`(?![\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}])[\p{L}\p{M}\p{N}'’-]`;

/** A run of unspaced letters, or a word of spaced ones beginning with a letter. */
const wordPattern = new RegExp(
  String.raw`(?<unspaced>(?:${unspacedLetter})+)|(?=\p{L})(?:${spacedLetter})+`,
  "gu",
);

type TextPart = {
  text: string;
  isWord: boolean;
  /** Whether the word is a run of a script written without spaces, whose every character can begin a word. */
  isUnspaced: boolean;
  start: number;
};

/** Splits text into the words a reader could look up, keeping the characters between them. `start` is each part's offset in the text. */
export function splitIntoWords(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastEnd = 0;
  const pushGap = (end: number) => {
    if (end > lastEnd)
      parts.push({
        text: text.slice(lastEnd, end),
        isWord: false,
        isUnspaced: false,
        start: lastEnd,
      });
  };
  for (const match of text.matchAll(wordPattern)) {
    pushGap(match.index);
    parts.push({
      text: match[0],
      isWord: true,
      isUnspaced: match.groups?.unspaced !== undefined,
      start: match.index,
    });
    lastEnd = match.index + match[0].length;
  }
  pushGap(text.length);
  return parts;
}

/** Removes inline markup such as `<i>` from subtitle text. */
export function stripMarkup(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

/**
 * Renders text with each word as a button, so that a word can be looked up or turned into a flashcard.
 * `gestures` receives what the user does to each word: click, double-click, hover or a held tap.
 * The words are marked as lookup triggers, so that pressing one leaves an open dictionary pop-up open for it.
 * The text is shown as it is; strip subtitle markup with `stripMarkup` first.
 */
export function ClickableText({
  text,
  activeWord,
  gestures = noGestures,
}: {
  text: string;
  /** The word the dictionary pop-up shows, by its offset in the text, and the pop-up's id. */
  activeWord?: { start: number; popupId: string };
  gestures?: WordGestures;
}) {
  const handlersFor = useWordGestures(gestures);
  return (
    <span className="whitespace-pre-line">
      {splitIntoWords(text).map((part) =>
        part.isWord ? (
          <button
            key={part.start}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={part.start === activeWord?.start || undefined}
            aria-controls={
              part.start === activeWord?.start ? activeWord.popupId : undefined
            }
            {...{ [lookupTriggerAttribute]: "" }}
            {...handlersFor(part)}
            className={clsx(
              // On a touch screen, a held tap starts a flashcard, so it must neither select the word nor open the browser's menu,
              // and a double tap must not zoom the page.
              "touch-manipulation rounded-sm px-px decoration-dotted underline-offset-4 hover:bg-accent-soft hover:underline focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
              part.start === activeWord?.start &&
                "bg-accent-soft text-accent-fg",
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

const noGestures: WordGestures = {};
