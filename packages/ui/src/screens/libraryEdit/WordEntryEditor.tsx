import type {
  LibraryEntry,
  LibrarySegment,
  LibraryWord,
} from "@easyimmerse/types";
import { useState } from "react";
import { Button } from "../../components/common/Button.tsx";
import { TextField } from "../../components/common/TextField.tsx";
import { languageName } from "../../lib/formatting/languages.ts";
import { DictionaryResults } from "./DictionaryResults.tsx";
import {
  mergeWithNext,
  splitWord,
  withEntry,
  wordText,
} from "./segmentWordEdits.ts";

/**
 * The entry of one word of a segment, which the library manager writes, or takes from their dictionaries' results,
 * and saves for this word or for every word written the same. The word can also be split between two of its characters,
 * merged with the next word, or removed.
 */
export function WordEntryEditor({
  segment,
  wordIndex,
  languages,
  onChangeWords,
  onApplyEverywhere,
}: {
  segment: LibrarySegment;
  wordIndex: number;
  languages: { target: string; translation: string };
  /** Saves the segment's words, changed as a button of the editor asks. */
  onChangeWords: (words: LibraryWord[]) => void;
  /** Saves the entry for every word written as this one is, in every segment. */
  onApplyEverywhere: (text: string, entry: LibraryEntry) => void;
}) {
  const word = segment.words[wordIndex];
  const [entry, setEntry] = useState(word?.entry);
  if (word === undefined || entry === undefined) return null;
  const text = wordText(segment, word);
  const change = (changes: Partial<LibraryEntry>) =>
    setEntry({ ...entry, ...changes });
  const hasNext = wordIndex + 1 < segment.words.length;
  return (
    <form
      aria-label={`Entry of ${text}`}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-muted p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onChangeWords(withEntry(segment, wordIndex, entry));
      }}
    >
      <SplitPoints
        text={text}
        start={word.start}
        onSplit={(offset) =>
          onChangeWords(splitWord(segment, wordIndex, offset))
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Term"
          value={entry.term}
          onChange={(event) => change({ term: event.target.value })}
        />
        <TextField
          label="Reading"
          value={entry.reading ?? ""}
          onChange={(event) => change({ reading: event.target.value || null })}
        />
        <TextField
          label={`Definition in ${languageName(languages.translation)}`}
          multiline
          value={entry.l1_definition}
          onChange={(event) => change({ l1_definition: event.target.value })}
        />
        <TextField
          label={`Definition in ${languageName(languages.target)}`}
          multiline
          value={entry.l2_definition}
          onChange={(event) => change({ l2_definition: event.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm">
          Save entry
        </Button>
        <Button size="sm" onClick={() => onApplyEverywhere(text, entry)}>
          Apply to every occurrence
        </Button>
        {hasNext && (
          <Button
            size="sm"
            onClick={() => onChangeWords(mergeWithNext(segment, wordIndex))}
          >
            Merge with the next word
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          onClick={() => onChangeWords(segment.words.toSpliced(wordIndex, 1))}
        >
          Remove word
        </Button>
      </div>
      <section
        aria-label="From your dictionaries"
        className="flex flex-col gap-2"
      >
        <h4 className="text-sm font-medium">From your dictionaries</h4>
        <DictionaryResults term={text} languages={languages} onUse={setEntry} />
      </section>
    </form>
  );
}

/** The word's characters, with a button between each two that splits the word there. */
function SplitPoints({
  text,
  start,
  onSplit,
}: {
  text: string;
  start: number;
  onSplit: (offset: number) => void;
}) {
  const characters = charactersOf(text);
  if (characters.length < 2)
    return <p className="text-lg font-medium">{text}</p>;
  return (
    <p className="flex flex-wrap items-center text-lg font-medium">
      {characters.map(({ character, offset }, index) => (
        <span key={offset} className="flex items-center">
          {index > 0 && (
            <button
              type="button"
              aria-label={`Split into ${text.slice(0, offset)} and ${text.slice(offset)}`}
              title="Split the word here"
              onClick={() => onSplit(start + offset)}
              className="mx-px h-6 w-1.5 rounded-sm bg-line hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
            />
          )}
          {character}
        </span>
      ))}
    </p>
  );
}

/** The characters of a text, by code point, each with its offset in UTF-16 code units. */
function charactersOf(text: string) {
  let offset = 0;
  return Array.from(text, (character) => {
    const at = offset;
    offset += character.length;
    return { character, offset: at };
  });
}
