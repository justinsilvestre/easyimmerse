import type { LookupResult, TagDefinition } from "@easyimmerse/types";
import { IconButton } from "../components/IconButton.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { DictionaryDefinitionsSection } from "./DictionaryDefinitionsSection.tsx";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { FrequencyList } from "./FrequencyList.tsx";
import { formatInflectionChains } from "./formatInflectionChains.ts";
import { PronunciationList } from "./PronunciationList.tsx";
import { ResultHeadword } from "./ResultHeadword.tsx";
import { resolveTags } from "./resolveTags.ts";
import { TagList } from "./TagList.tsx";

/**
 * One result in the dictionary pop-up: the term and its reading, each equally good chain of inflections that leads to the looked-up text,
 * its tags, frequencies and pronunciations, and then each dictionary's definitions.
 * Double-clicked words go to `onWordLookup`, held words to `onWordHold`; links to other headwords go to `onLookup`.
 */
export function LookupResultCard({
  result,
  resolveMediaUrl,
  onWordLookup,
  onWordHold,
  onLookup,
  onCreateFlashcard,
}: {
  result: LookupResult;
  resolveMediaUrl: ResolveMediaUrl;
  onWordLookup: (word: string) => void;
  onWordHold?: (word: string) => void;
  onLookup: (term: string) => void;
  onCreateFlashcard: () => void;
}) {
  const inflectionLines = formatInflectionChains(result.inflectionChains);
  return (
    <article className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 first:pt-0">
      <header className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <ResultHeadword term={result.term} reading={result.reading} />
        {result.matchedText !== result.term && (
          <span className="text-xs text-fg-faint">
            from {result.matchedText}
          </span>
        )}
        <TagList tags={termTags(result)} />
        <IconButton
          label="Flashcard from this entry"
          className="ml-auto size-6"
          onClick={onCreateFlashcard}
        >
          <NewFlashcardIcon className="size-4" />
        </IconButton>
      </header>
      {inflectionLines.length > 0 && (
        <div className="text-xs text-fg-muted">
          {inflectionLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      <FrequencyList frequencies={result.frequencies} />
      <PronunciationList
        pronunciations={result.pronunciations}
        reading={result.reading ?? result.term}
      />
      {result.definitions.map((dictionaryDefinitions, index) => (
        <DictionaryDefinitionsSection
          // One dictionary may hold several entries for the same term and reading, and results never reorder.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          dictionaryDefinitions={dictionaryDefinitions}
          resolveMediaUrl={resolveMediaUrl}
          onWordLookup={onWordLookup}
          onWordHold={onWordHold}
          onLookup={onLookup}
        />
      ))}
    </article>
  );
}

/** Collects the term tags of every dictionary in a result, each name once. */
function termTags(result: LookupResult): TagDefinition[] {
  const tags = result.definitions.flatMap(({ entry, tags }) =>
    resolveTags(entry.termTags, tags),
  );
  return tags.filter(
    (tag, index) => tags.findIndex(({ name }) => name === tag.name) === index,
  );
}
