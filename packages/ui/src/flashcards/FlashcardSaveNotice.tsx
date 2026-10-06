import { Notice, type NoticeTone } from "../notices/Notice.tsx";

/** What happened to a flashcard after it was saved, depending on whether AnkiConnect is enabled and reachable. */
type FlashcardSaveOutcome =
  | "savedInProject"
  | "sentToAnki"
  | "queuedForAnki"
  | "rejectedByAnki";

const messages: Record<FlashcardSaveOutcome, string> = {
  savedInProject: "Flashcard saved to the project.",
  sentToAnki: "Flashcard sent to Anki.",
  queuedForAnki:
    "Anki is not running. The flashcard is queued and will be sent when AnkiConnect is reachable.",
  rejectedByAnki:
    "Anki did not accept the flashcard. It stays saved in the project.",
};

const tones: Record<FlashcardSaveOutcome, NoticeTone> = {
  savedInProject: "success",
  sentToAnki: "success",
  queuedForAnki: "waiting",
  rejectedByAnki: "danger",
};

/** A short message that appears after a flashcard is saved. */
export function FlashcardSaveNotice({
  outcome,
  onRetry,
  onDismiss,
}: {
  outcome: FlashcardSaveOutcome;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="status">
      <Notice
        tone={tones[outcome]}
        message={messages[outcome]}
        actions={
          outcome === "rejectedByAnki" && onRetry
            ? [{ label: "Retry", onSelect: onRetry }]
            : []
        }
        onDismiss={onDismiss}
      />
    </div>
  );
}
