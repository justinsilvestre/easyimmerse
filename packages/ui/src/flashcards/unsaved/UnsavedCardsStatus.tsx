import { selectNotices } from "@easyimmerse/state";
import { X } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { Button } from "../../components/Button.tsx";
import { IconButton } from "../../components/IconButton.tsx";
import { useAppSelector } from "../../hooks/useAppSelector.ts";
import { flashcardNoticeKeys } from "../flashcardNotices.ts";
import { useUnsavedCards } from "../SharedSavingContext.tsx";
import type { ListedUnsavedCard } from "./unsavedCardStore.ts";
import { useUnsavedCardActions } from "./useUnsavedCardActions.ts";

/**
 * One lasting line that counts the flashcards that could not be saved, and expands into a list of them,
 * each with Retry, Open and Discard. The count is a live region, announced when it first appears and when it changes.
 * A card whose own notice is showing, as a refused save's is, is left to that notice, so that one failure shows once.
 */
export function UnsavedCardsStatus() {
  const cards = useCardsWithoutOwnNotice();
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
        {/* Always present, so that its text is announced when it appears. Not a status role, which the screens' own statuses keep. */}
        <p
          aria-live="polite"
          aria-atomic
          className={hasCards ? "flex-1" : "sr-only"}
        >
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
        aria-disabled={card.isRetrying || undefined}
        onClick={() => {
          if (!card.isRetrying) actions.discard(card.flashcardId);
        }}
      >
        Discard
      </Button>
    </li>
  );
}

/** The listed cards, less those whose own notice is showing. */
function useCardsWithoutOwnNotice(): readonly ListedUnsavedCard[] {
  const store = useUnsavedCards();
  const cards = useSyncExternalStore(store.subscribe, store.list);
  const notices = useAppSelector(selectNotices);
  const shownKeys = new Set(notices.map((notice) => notice.key));
  return cards.filter(
    (card) => !shownKeys.has(flashcardNoticeKeys.saveRefused(card.flashcardId)),
  );
}

function countText(count: number): string {
  if (count === 0) return "";
  return count === 1
    ? "1 flashcard not saved"
    : `${count} flashcards not saved`;
}
