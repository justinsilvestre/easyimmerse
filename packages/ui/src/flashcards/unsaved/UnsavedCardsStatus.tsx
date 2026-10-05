import { X } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { Button } from "../../components/Button.tsx";
import { IconButton } from "../../components/IconButton.tsx";
import { useUnsavedCards } from "./UnsavedCardsContext.tsx";
import type { ListedUnsavedCard } from "./unsavedCardStore.ts";
import { useUnsavedCardActions } from "./useUnsavedCardActions.ts";

/**
 * One lasting line that counts the flashcards that could not be saved, and expands into a list of them,
 * each with Retry, Open and Discard. The count is a live region, announced when it first appears and when it changes.
 */
export function UnsavedCardsStatus() {
  const store = useUnsavedCards();
  const cards = useSyncExternalStore(store.subscribe, store.list);
  const actions = useUnsavedCardActions();
  const [isExpanded, setExpanded] = useState(false);
  const listId = useId();
  const hasCards = cards.length > 0;
  const canRetry = cards.some((card) => !card.isRejected);
  return (
    <div
      className={
        hasCards
          ? "pointer-events-auto flex max-w-md flex-col gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg shadow-md"
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        {/* Always present, so that its text is announced when it appears. */}
        <p role="status" className={hasCards ? "flex-1" : "sr-only"}>
          {countText(cards.length)}
        </p>
        {hasCards && canRetry && (
          <Button size="sm" onClick={actions.retryAll}>
            Retry all
          </Button>
        )}
        {hasCards &&
          (isExpanded ? (
            <IconButton
              label="Hide the list"
              aria-expanded
              aria-controls={listId}
              onClick={() => setExpanded(false)}
            >
              <X className="size-4" />
            </IconButton>
          ) : (
            <Button
              size="sm"
              aria-expanded={false}
              aria-controls={listId}
              onClick={() => setExpanded(true)}
            >
              Show
            </Button>
          ))}
      </div>
      {hasCards && isExpanded && (
        <ul
          id={listId}
          aria-label="Flashcards not saved"
          className="flex flex-col gap-1"
        >
          {cards.map((card) => (
            <UnsavedCardItem key={card.flashcardId} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UnsavedCardItem({ card }: { card: ListedUnsavedCard }) {
  const actions = useUnsavedCardActions();
  const word = card.card.editor.content.word;
  return (
    <li className="flex items-center gap-2">
      <span className="flex-1">
        {word}
        {card.isRejected && " (refused by the server)"}
        {card.isRetrying && " (saving…)"}
      </span>
      {!card.isRejected && (
        <Button
          size="sm"
          aria-label={`Retry “${word}”`}
          aria-disabled={card.isRetrying || undefined}
          onClick={() => {
            if (!card.isRetrying) actions.retry(card.flashcardId);
          }}
        >
          Retry
        </Button>
      )}
      {card.mediaFileId !== null && (
        <Button
          size="sm"
          aria-label={`Open “${word}”`}
          onClick={() => actions.open(card.flashcardId)}
        >
          Open
        </Button>
      )}
      <Button
        size="sm"
        variant="danger"
        aria-label={`Discard “${word}”`}
        onClick={() => actions.discard(card.flashcardId)}
      >
        Discard
      </Button>
    </li>
  );
}

function countText(count: number): string {
  if (count === 0) return "";
  return count === 1
    ? "1 flashcard not saved"
    : `${count} flashcards not saved`;
}
