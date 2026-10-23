import type { LibrarySegment } from "@easyimmerse/types";
import clsx from "clsx";
import { splitAtWords } from "../components/splitAtWords.ts";
import { formatLibraryDuration } from "./libraryLabels.ts";
import { isWithoutDefinition } from "./segmentWordEdits.ts";

/**
 * One segment of a library item's text, with each of its words as a button that selects it.
 * A word without a definition is marked. Text between words that holds letters is a button that makes it a word,
 * unless the words are locked.
 */
export function SegmentWordsRow({
  segment,
  selectedWordIndex,
  isLocked,
  onSelectWord,
  onAddWord,
}: {
  segment: LibrarySegment;
  /** The index among the segment's words of the selected word, or null when none of them is selected. */
  selectedWordIndex: number | null;
  isLocked: boolean;
  onSelectWord: (wordIndex: number) => void;
  onAddWord: (start: number, end: number) => void;
}) {
  const parts = splitAtWords(segment.text, segment.words);
  let wordIndex = -1;
  return (
    <div className="flex flex-col gap-1">
      {segment.start_ms !== null && (
        <span className="text-xs text-fg-faint tabular-nums">
          {formatLibraryDuration(segment.start_ms)}
        </span>
      )}
      <p className="text-lg leading-relaxed">
        {parts.map((part) => {
          if (!part.isWord)
            return (
              <Gap
                key={part.start}
                text={part.text}
                start={part.start}
                isLocked={isLocked}
                onAddWord={onAddWord}
              />
            );
          wordIndex += 1;
          const index = wordIndex;
          const word = segment.words[index];
          const isUndefined = word !== undefined && isWithoutDefinition(word);
          return (
            <button
              key={part.start}
              type="button"
              aria-pressed={index === selectedWordIndex}
              title={isUndefined ? "No definition yet" : undefined}
              onClick={() => onSelectWord(index)}
              className={clsx(
                "rounded-sm border-b-2 px-0.5 focus-visible:outline-2 focus-visible:outline-accent",
                index === selectedWordIndex
                  ? "border-accent bg-accent-soft text-accent-fg"
                  : "hover:bg-surface-muted",
                index !== selectedWordIndex &&
                  (isUndefined
                    ? "border-dashed border-warning-fg"
                    : "border-line-strong"),
              )}
            >
              {part.text}
            </button>
          );
        })}
      </p>
    </div>
  );
}

/** Text between two words: a button that makes a word of its letters, when it has any and the words can change. */
function Gap({
  text,
  start,
  isLocked,
  onAddWord,
}: {
  text: string;
  start: number;
  isLocked: boolean;
  onAddWord: (start: number, end: number) => void;
}) {
  const letters = /[\p{L}\p{N}](?:.*[\p{L}\p{N}])?/u.exec(text);
  if (isLocked || letters === null) return <span>{text}</span>;
  const from = start + letters.index;
  const to = from + letters[0].length;
  return (
    <span>
      {text.slice(0, letters.index)}
      <button
        type="button"
        aria-label={`Make a word of ${letters[0]}`}
        title="Make this a word"
        onClick={() => onAddWord(from, to)}
        className="rounded-sm text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {letters[0]}
      </button>
      {text.slice(letters.index + letters[0].length)}
    </span>
  );
}
