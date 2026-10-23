import type {
  LibraryEntry,
  LibrarySegment,
  LibraryWord,
} from "@easyimmerse/types";
import { useId, useState } from "react";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { pluralize } from "../components/pluralize.ts";
import { SegmentWordsRow } from "./SegmentWordsRow.tsx";
import {
  addWord,
  applyToEveryOccurrence,
  isWithoutDefinition,
  type SegmentWords,
} from "./segmentWordEdits.ts";
import { WordEntryEditor } from "./WordEntryEditor.tsx";

type Selection = { segmentIndex: number; wordIndex: number };

/**
 * The words of each segment of a library item's text, as learners will click them, for the library manager to set:
 * selecting a word opens its entry, which can also split it, merge it with the next word, or copy its entry to every word written the same.
 * Words without a definition are marked and counted, and a checkbox shows only the segments that have one.
 * While `isLocked`, as for a published item, the words only show.
 */
export function SegmentWordsEditor({
  segments,
  languages,
  isLocked,
  onSaveWords,
}: {
  segments: readonly LibrarySegment[];
  languages: { target: string; translation: string };
  isLocked: boolean;
  /** Saves the words of the segments a change touched. */
  onSaveWords: (changes: SegmentWords[]) => void;
}) {
  const headingId = useId();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isOnlyUndefined, setOnlyUndefined] = useState(false);
  const undefinedCount = segments
    .flatMap((segment) => segment.words)
    .filter(isWithoutDefinition).length;
  const shown = isOnlyUndefined
    ? segments.filter((segment) => segment.words.some(isWithoutDefinition))
    : segments;
  const save = (segmentIndex: number, words: LibraryWord[]) => {
    setSelection(null);
    onSaveWords([{ segmentIndex, words }]);
  };
  const applyEverywhere = (text: string, entry: LibraryEntry) => {
    setSelection(null);
    onSaveWords(applyToEveryOccurrence(segments, text, entry));
  };
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="font-semibold">
          Words
        </h2>
        <CheckboxField
          label="Show only words without a definition"
          hint={`${pluralize(undefinedCount, "word")} without a definition`}
          checked={isOnlyUndefined}
          onChange={(event) => setOnlyUndefined(event.target.checked)}
        />
      </div>
      {isLocked && (
        <p className="text-sm text-fg-muted">
          Unpublish the item to change its words.
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
          const wordIndex =
            selection?.segmentIndex === segment.index
              ? selection.wordIndex
              : null;
          return (
            <li key={segment.index} className="flex flex-col gap-2 py-3">
              <SegmentWordsRow
                segment={segment}
                selectedWordIndex={wordIndex}
                isLocked={isLocked}
                onSelectWord={(index) =>
                  setSelection(
                    wordIndex === index
                      ? null
                      : { segmentIndex: segment.index, wordIndex: index },
                  )
                }
                onAddWord={(start, end) =>
                  save(segment.index, addWord(segment, start, end))
                }
              />
              {wordIndex !== null && !isLocked && (
                <WordEntryEditor
                  key={`${segment.index}-${wordIndex}`}
                  segment={segment}
                  wordIndex={wordIndex}
                  languages={languages}
                  onChangeWords={(words) => save(segment.index, words)}
                  onApplyEverywhere={applyEverywhere}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
