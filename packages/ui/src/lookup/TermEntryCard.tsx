import { Plus } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { ClickableText } from "../components/ClickableText.tsx";
import type { LookupEntry } from "./lookupState.ts";

export function TermEntryCard({
  entry,
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
        {entry.definitions.map((definition) => (
          <li key={definition}>
            <ClickableText text={definition} onWordClick={onWordClick} />
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-2 text-xs text-fg-faint">
        <span>{entry.dictionaryTitle}</span>
        <Button size="sm" variant="subtle" onClick={onCreateFlashcard}>
          <Plus className="size-3" aria-hidden />
          Flashcard from this entry
        </Button>
      </div>
    </article>
  );
}
