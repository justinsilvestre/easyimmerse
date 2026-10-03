import clsx from "clsx";
import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";

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
  const hasFailed = outcome === "rejectedByAnki";
  const isQueued = outcome === "queuedForAnki";
  return (
    <div
      role="status"
      className={clsx(
        "flex max-w-md items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-md",
        hasFailed && "border-danger-line bg-danger-soft text-danger-fg",
        isQueued && "border-warning-line bg-warning-soft text-warning-fg",
        !hasFailed && !isQueued && "border-line bg-surface text-fg",
      )}
    >
      <OutcomeIcon outcome={outcome} />
      <span className="flex-1">{messages[outcome]}</span>
      {hasFailed && onRetry && (
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
      <IconButton label="Dismiss" onClick={onDismiss}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}

function OutcomeIcon({ outcome }: { outcome: FlashcardSaveOutcome }) {
  const className = "size-4 shrink-0";
  switch (outcome) {
    case "savedInProject":
    case "sentToAnki":
      return (
        <Check className={clsx(className, "text-success-fg")} aria-hidden />
      );
    case "queuedForAnki":
      return <Clock className={className} aria-hidden />;
    case "rejectedByAnki":
      return <AlertTriangle className={className} aria-hidden />;
  }
}
