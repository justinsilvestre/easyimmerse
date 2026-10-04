import type { LookupEntry } from "@easyimmerse/types";
import { Badge } from "../components/Badge.tsx";
import { ClickableText } from "../components/ClickableText.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";

/** One dictionary entry in the pop-up, with its definitions ready to be looked up or made into a flashcard. */
export function TermEntryCard({
  entry: { entry, dictionary_title },
  onWordClick,
  onCreateFlashcard,
}: {
  entry: LookupEntry;
  onWordClick: (word: string) => void;
  onCreateFlashcard: () => void;
}) {
  return (
    <article className="flex flex-col gap-1.5 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">{entry.term}</span>
        {entry.reading && (
          <span className="text-sm text-fg-muted">{entry.reading}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {entry.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </span>
      </div>
      <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-sm">
        {entry.definitions.map((definition, index) => (
          // Definitions can repeat within an entry and never reorder.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={index}>
            <ClickableText text={definition} onWordClick={onWordClick} />
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-2 text-xs text-fg-faint">
        <span>{dictionary_title}</span>
        <IconButton
          label="Flashcard from this entry"
          className="size-6"
          onClick={onCreateFlashcard}
        >
          <NewFlashcardIcon className="size-4" />
        </IconButton>
      </div>
    </article>
  );
}
