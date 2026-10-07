import clsx from "clsx";
import { characterLength } from "./characterLength.ts";
import {
  clickableWordAttribute,
  lookupTriggerAttribute,
} from "./lookupTrigger.ts";
import { type Range, RunText } from "./RunText.tsx";
import type { TextCursor } from "./textCursor.ts";
import { useKeyboardCursor } from "./useKeyboardCursor.ts";
import { useTextCursor } from "./useTextCursor.ts";
import { useWordGestures, type WordGestures } from "./useWordGestures.ts";

/** The scripts written without spaces between words: Chinese characters, hiragana, katakana and Bopomofo. */
const unspacedScript = String.raw`\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Bopomofo}`;

/**
 * A character of an unspaced script that belongs in a run: a letter or mark, with marks such as ー,
 * the ideographic zero 〇 and the spacing voicing marks ゛ and ゜, but not punctuation such as 、.
 */
const unspacedLetter = String.raw`(?=[\p{L}\p{M}〇゛゜])[${unspacedScript}]`;

const unspacedLetterPattern = new RegExp(`^${unspacedLetter}$`, "u");

/** Tells whether a character is a letter of a script written without spaces, every one of which can begin a word. */
export function isUnspacedLetter(character: string): boolean {
  return unspacedLetterPattern.test(character);
}

/** A digit, ASCII or fullwidth, which a run takes in, as in ３人 or 2026年. */
const runDigit = "[0-9０-９]";

/** A letter, mark, digit or joining character of any other script. */
const spacedLetter = String.raw`(?![${unspacedScript}])[\p{L}\p{M}\p{N}'’-]`;

/**
 * A run of an unspaced script, with any digits before or inside it, or a word of another script beginning with a letter.
 * Digits alone make no word.
 */
const wordPattern = new RegExp(
  String.raw`(?<unspaced>${runDigit}*${unspacedLetter}(?:${unspacedLetter}|${runDigit})*)|(?=\p{L})(?:${spacedLetter})+`,
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
 * The lookup cursor, which the mouse and the keyboard move alike, is highlighted once the lookup from it has answered:
 * a word written with spaces whole, and in a run of a script written without spaces the text that lookup matched,
 * or the character alone when nothing matched. The highlight stays while the mouse moves within it, and goes when it moves elsewhere.
 * Left and Right move the cursor from the focused word along the text, as `useKeyboardCursor` describes.
 * The word the pop-up shows is highlighted the same way.
 * The words that flashcards were made from are underlined, and in a run only their characters.
 * The words are marked as lookup triggers, so that pressing one leaves an open dictionary pop-up open for it.
 * The text is shown as it is; strip subtitle markup with `stripMarkup` first.
 */
export function ClickableText({
  text,
  activeWord,
  cursor: givenCursor,
  markedRanges = noRanges,
  gestures = noGestures,
}: {
  text: string;
  /**
   * The word the dictionary pop-up shows, by its offset in the text, and the pop-up's id.
   * `length` is how much of the text the lookup matched, which a run written without spaces highlights.
   */
  activeWord?: ActiveWord;
  /**
   * The lookup cursor, or null while it lies elsewhere, for a screen that keeps one cursor across several texts;
   * the gestures then report where it should move. Without it, the text keeps a cursor of its own.
   */
  cursor?: TextCursor | null;
  /** Where the text holds the words that flashcards were made from. */
  markedRanges?: readonly Range[];
  gestures?: WordGestures;
}) {
  const textCursor = useTextCursor(text, givenCursor, gestures);
  const { cursor } = textCursor;
  const cursorStart = cursor?.start ?? null;
  const pointer = useWordGestures(textCursor.gestures, cursorStart);
  const parts = splitIntoWords(text);
  const keyboard = useKeyboardCursor(parts, cursorStart, pointer);
  const highlighted = highlightOf(cursor);
  return (
    // Positioned, so that the announcement region below, which is positioned off screen, stays inside this text
    // rather than reaching out of a scrolling list and stretching the page.
    <span className="relative whitespace-pre-line" {...keyboard.textHandlers}>
      {parts.map((part) => {
        if (!part.isWord) return part.text;
        const isActive =
          activeWord !== undefined && contains(part, activeWord.start);
        const isHighlighted =
          highlighted !== null && contains(part, highlighted.start);
        const flashcardWords = rangesWithin(part, markedRanges);
        const hasFlashcard = flashcardWords.length > 0;
        return (
          <button
            key={part.start}
            type="button"
            // The highlight splits a run into pieces, which must not split its name.
            aria-label={part.isUnspaced ? part.text : undefined}
            aria-keyshortcuts="ArrowLeft ArrowRight"
            aria-haspopup="dialog"
            aria-expanded={isActive || undefined}
            aria-controls={isActive ? activeWord?.popupId : undefined}
            title={hasFlashcard ? "Has a flashcard" : undefined}
            {...{ [lookupTriggerAttribute]: "", [clickableWordAttribute]: "" }}
            {...pointer.handlersFor(part)}
            {...keyboard.handlersFor(part)}
            className={clsx(
              // On a touch screen, a held tap starts a flashcard, so it must neither select the word nor open the browser's menu,
              // and a double tap must not zoom the page.
              // Browsers give buttons no text shadow of their own, so the word takes the shadow of the text around it.
              "touch-manipulation rounded-sm px-px [text-shadow:inherit] focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
              // A run highlights only the characters concerned, inside itself.
              !part.isUnspaced &&
                (isActive || isHighlighted) &&
                "bg-accent-soft text-accent-fg",
            )}
          >
            {part.isUnspaced || hasFlashcard ? (
              <RunText
                text={part.text}
                matched={
                  isActive && activeWord ? matchedRange(part, activeWord) : null
                }
                hovered={
                  isHighlighted && highlighted
                    ? matchedRange(part, highlighted)
                    : null
                }
                flashcardWords={flashcardWords}
              />
            ) : (
              part.text
            )}
          </button>
        );
      })}
      {/* One region for the whole text, outside the buttons, where screen readers announce reliably. */}
      <span aria-live="polite" className="sr-only">
        {keyboard.hasFocus ? announcementOf(cursor, parts) : ""}
      </span>
    </span>
  );
}

type ActiveWord = { start: number; length?: number; popupId: string };

/** The text the cursor highlights, by its offset, with the length its lookup matched; nothing until that lookup answers. */
function highlightOf(
  cursor: TextCursor | null,
): { start: number; length?: number } | null {
  if (cursor?.matchedLength === undefined) return null;
  return { start: cursor.start, length: cursor.matchedLength ?? undefined };
}

/** What to announce of a cursor the keyboard has moved into a run, which the run's button alone does not tell. */
function announcementOf(
  cursor: TextCursor | null,
  parts: readonly TextPart[],
): string {
  if (cursor?.input !== "keyboard") return "";
  const run = parts.find(
    (part) => part.isUnspaced && contains(part, cursor.start),
  );
  if (!run) return "";
  const offset = cursor.start - run.start;
  const character = run.text.slice(
    offset,
    offset + characterLength(run.text, offset),
  );
  return `Looks up from ${character}`;
}

const noGestures: WordGestures = {};

const noRanges: readonly Range[] = [];

/** The ranges that overlap a part of the text, cut to the part and counted from its start. */
function rangesWithin(
  part: { start: number; text: string },
  ranges: readonly Range[],
): Range[] {
  const end = part.start + part.text.length;
  return ranges
    .map((range) => ({
      from: Math.max(range.from, part.start) - part.start,
      to: Math.min(range.to, end) - part.start,
    }))
    .filter((range) => range.from < range.to);
}

function contains(part: { start: number; text: string }, offset: number) {
  return offset >= part.start && offset < part.start + part.text.length;
}

/**
 * The range of a run, from its start, that the lookup matched,
 * or, until the lookup reports its match, the character it looks up from.
 */
function matchedRange(
  part: { start: number; text: string },
  word: { start: number; length?: number },
): Range {
  const from = word.start - part.start;
  const length = word.length ?? characterLength(part.text, from);
  return { from, to: Math.min(from + length, part.text.length) };
}
