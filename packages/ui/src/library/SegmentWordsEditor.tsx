import type { LibraryWordPlace } from "@easyimmerse/state";
import type {
  LibraryEntry,
  LibrarySegment,
  LibraryWord,
} from "@easyimmerse/types";
import { useId } from "react";
import { CheckboxField } from "../components/common/CheckboxField.tsx";
import { pluralize } from "../lib/formatting/pluralize.ts";
import { type LibraryLock, libraryLockText } from "./libraryLock.ts";
import { SegmentWordsRow } from "./SegmentWordsRow.tsx";
import { addWord, isWithoutDefinition } from "./segmentWordEdits.ts";
import { WordEntryEditor } from "./WordEntryEditor.tsx";

/**
 * The words of each segment of a library item's text, as learners will click them, for the library manager to set:
 * selecting a word opens its entry, which can also split it, merge it with the next word, or give its entry to every word written the same.
 * Words without a definition are marked and counted, and a checkbox shows only the lines that have one.
 * The entry closes once its change is saved, and stays open with what was typed when the save fails.
 * While `lock` says the item is being prepared or is published, the words only show.
 */
export function SegmentWordsEditor({
  segments,
  languages,
  lock,
  selectedWord,
  isOnlyUndefinedShown,
  onSelectWord,
  onShowOnlyUndefined,
  onSaveWords,
  onApplyEverywhere,
}: {
  segments: readonly LibrarySegment[];
  languages: { target: string; translation: string };
  lock: LibraryLock;
  /** The word whose entry is open, which shows only while the segment still has a word beginning there. */
  selectedWord: LibraryWordPlace | null;
  isOnlyUndefinedShown: boolean;
  onSelectWord: (place: LibraryWordPlace | null) => void;
  onShowOnlyUndefined: (isOn: boolean) => void;
  /** Saves the words of a segment, and resolves to whether they were saved. */
  onSaveWords: (segmentIndex: number, words: LibraryWord[]) => Promise<boolean>;
  /** Gives an entry to every word written `text`, and resolves to whether it was saved. */
  onApplyEverywhere: (text: string, entry: LibraryEntry) => Promise<boolean>;
}) {
  const headingId = useId();
  const undefinedCount = segments
    .flatMap((segment) => segment.words)
    .filter(isWithoutDefinition).length;
  const shown = isOnlyUndefinedShown
    ? segments.filter((segment) => segment.words.some(isWithoutDefinition))
    : segments;
  const closeOnceSaved = (saving: Promise<boolean>) =>
    saving.then((isSaved) => {
      if (isSaved) onSelectWord(null);
    });
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="font-semibold">
          Words
        </h2>
        <CheckboxField
          label="Show only lines with words without a definition"
          hint={`${pluralize(undefinedCount, "word")} without a definition`}
          checked={isOnlyUndefinedShown}
          onChange={(event) => onShowOnlyUndefined(event.target.checked)}
        />
      </div>
      {lock && (
        <p className="text-sm text-fg-muted">
          {libraryLockText(lock, "change its words")}
        </p>
      )}
      {shown.length === 0 && (
        <p className="text-sm text-fg-muted">
          {segments.length === 0
            ? "The item has no text yet. Upload its file or subtitles first."
            : "Every word has a definition."}
        </p>
      )}
      <ol aria-label="Segments" className="flex flex-col divide-y divide-line">
        {shown.map((segment) => {
          const wordIndex = selectedIndexIn(segment, selectedWord);
          const select = (index: number) => {
            const start = segment.words[index]?.start;
            onSelectWord(
              index === wordIndex || start === undefined
                ? null
                : { segmentIndex: segment.index, start },
            );
          };
          return (
            <li key={segment.index} className="flex flex-col gap-2 py-3">
              <SegmentWordsRow
                segment={segment}
                selectedWordIndex={wordIndex}
                isLocked={lock !== null}
                onSelectWord={select}
                onAddWord={(start, end) =>
                  onSaveWords(segment.index, addWord(segment, start, end))
                }
              />
              {wordIndex !== null && lock === null && (
                <WordEntryEditor
                  key={`${segment.index}-${selectedWord?.start}`}
                  segment={segment}
                  wordIndex={wordIndex}
                  languages={languages}
                  onChangeWords={(words) =>
                    closeOnceSaved(onSaveWords(segment.index, words))
                  }
                  onApplyEverywhere={(text, entry) =>
                    closeOnceSaved(onApplyEverywhere(text, entry))
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The index among a segment's words of the selected word, or null when it lies elsewhere or the segment no longer has it. */
function selectedIndexIn(
  segment: LibrarySegment,
  selected: LibraryWordPlace | null,
): number | null {
  if (selected?.segmentIndex !== segment.index) return null;
  const index = segment.words.findIndex(
    ({ start }) => start === selected.start,
  );
  return index === -1 ? null : index;
}
