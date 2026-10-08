import { southEastAsianCharacterRanges } from "@easyimmerse/backend";
import clsx from "clsx";
import {
  clickableWordAttribute,
  lookupTriggerAttribute,
} from "./lookupTrigger.ts";
import { type Range, RunText } from "./RunText.tsx";
import { runLookupEnd } from "./runLookupStarts.ts";
import type { TextCursor } from "./textCursor.ts";
import { useKeyboardCursor } from "./useKeyboardCursor.ts";
import { useTextCursor } from "./useTextCursor.ts";
import { useWordGestures, type WordGestures } from "./useWordGestures.ts";

/** Chinese characters, hiragana, katakana and Bopomofo, which are written without spaces between words. */
const unspacedScript = String.raw`\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Bopomofo}`;

/**
 * Every script written without spaces between words: those of `unspacedScript`, and the South East Asian scripts, such as Thai,
 * whose runs are looked up from each letter until a tokenizer can find their words.
 */
const runScript = `${unspacedScript}${southEastAsianCharacterRanges}`;

/**
 * A character of an unspaced script that belongs in a run: a letter or mark, with marks such as ー,
 * the ideographic zero 〇 and the spacing voicing marks ゛ and ゜, but not punctuation such as 、.
 */
const unspacedLetter = String.raw`(?=[\p{L}\p{M}〇゛゜])[${unspacedScript}]`;

const unspacedLetterPattern = new RegExp(`^${unspacedLetter}$`, "u");

/**
 * Tells whether a character is a letter of Chinese, Japanese or Bopomofo, every one of which can begin a word.
 * The reader finds the words of the South East Asian scripts with the browser's word segmenter instead, so they are left out.
 */
export function isUnspacedLetter(character: string): boolean {
  return unspacedLetterPattern.test(character);
}

/** A digit, ASCII or fullwidth, which a run takes in, as in ３人 or 2026年. */
const runDigit = "[0-9０-９]";

/** A letter or mark of a script written without spaces that belongs in a run, as `unspacedLetter` describes. */
const runLetter = String.raw`(?=[\p{L}\p{M}〇゛゜])[${runScript}]`;

/** A letter, mark, digit or joining character of any other script. */
const spacedLetter = String.raw`(?![${runScript}])[\p{L}\p{M}\p{N}'’-]`;

/**
 * A run of an unspaced script, with any digits before or inside it, or a word of another script beginning with a letter.
 * Digits alone make no word.
 */
const wordPattern = new RegExp(
  String.raw`(?<unspaced>${runDigit}*${runLetter}(?:${runLetter}|${runDigit})*)|(?=\p{L})(?:${spacedLetter})+`,
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
 * The lookup cursor, which the mouse and the keyboard move alike, is highlighted as soon as it moves:
 * a word written with spaces whole, and in a run of a script written without spaces the character it lies on,
 * which grows to the text the lookup from it matched once that lookup answers.
 * The highlight stays while the mouse moves within it, and moves when the mouse moves elsewhere.
 * Left and Right move the cursor from the focused word along the text by a word, and with Shift by a character of a run,
 * as `useKeyboardCursor` describes.
 * The word the pop-up shows is highlighted the same way while there is no cursor, so that only one word is ever highlighted.
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
  const keyboard = useKeyboardCursor(parts, cursor, pointer);
  const highlighted = highlightOf(cursor);
  return (
    // Positioned, so that the announcement region below, which is positioned off screen, stays inside this text
    // rather than reaching out of a scrolling list and stretching the page.
    <span className="relative whitespace-pre-line" {...keyboard.textHandlers}>
      {parts.map((part) => {
        if (!part.isWord) return part.text;
        const isActive =
          activeWord !== undefined && contains(part, activeWord.start);
        const isActiveHighlighted =
          isActive && cursor === null && activeWord?.isHighlighted !== false;
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
            aria-keyshortcuts={
              part.isUnspaced ? runKeyShortcuts : wordKeyShortcuts
            }
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
                (isActiveHighlighted || isHighlighted) &&
                "bg-accent-soft text-accent-fg",
            )}
          >
            {part.isUnspaced || hasFlashcard ? (
              <RunText
                text={part.text}
                matched={
                  isActiveHighlighted && activeWord
                    ? matchedRange(part, activeWord)
                    : null
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

/** The word the dictionary pop-up shows, by its offset in the text, and the pop-up's id. */
export type ActiveWord = {
  start: number;
  /** How much of the text the lookup matched, which a run written without spaces highlights. */
  length?: number;
  popupId: string;
  /** False while a lookup cursor lies in another text, whose highlight takes the place of this word's. */
  isHighlighted?: boolean;
};

/** The text the cursor highlights, by its offset, with the length its lookup matched once that lookup has answered with a match. */
function highlightOf(
  cursor: TextCursor | null,
): { start: number; length?: number } | null {
  if (cursor === null) return null;
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
  const character = run.text.slice(offset, runLookupEnd(run.text, offset));
  return `Looks up from ${character}`;
}

const wordKeyShortcuts = "ArrowLeft ArrowRight";

const runKeyShortcuts = "ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight";

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
 * or, until the lookup reports its match, the character it looks up from with any marks on it, or the digits it looks up from.
 */
function matchedRange(
  part: { start: number; text: string },
  word: { start: number; length?: number },
): Range {
  const from = word.start - part.start;
  const to =
    word.length === undefined
      ? runLookupEnd(part.text, from)
      : from + word.length;
  return { from, to: Math.min(to, part.text.length) };
}
