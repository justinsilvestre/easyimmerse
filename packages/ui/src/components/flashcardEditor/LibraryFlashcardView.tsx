import type { AnkiFateOfDeletion } from "@easyimmerse/state";
import type { FlashcardContent, ProjectSettings } from "@easyimmerse/types";
import { CirclePause, X } from "lucide-react";
import { Button } from "../common/Button.tsx";
import { IconButton } from "../common/IconButton.tsx";
import { FlashcardDeleteDialog } from "../flashcards/FlashcardDeleteDialog.tsx";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { SuspendedStrip } from "./SuspendedStrip.tsx";

/**
 * A flashcard made from a library item, shown as it is reviewed, since the server fills it and refuses changes.
 * It can be closed, suspended, brought back into the review while suspended, or deleted after confirming in a dialog.
 */
export function LibraryFlashcardView({
  content,
  settings,
  languages,
  screenshotUrl = null,
  ankiFate,
  isConfirmingDelete,
  onPlayAudio,
  onUnsuspend = null,
  onSuspend,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onClose,
}: {
  content: FlashcardContent;
  /** The project's settings, which choose the fields on each side of the card. */
  settings: Pick<
    ProjectSettings,
    "flashcard_fields" | "flashcard_front_fields"
  >;
  languages: FlashcardLanguages;
  screenshotUrl?: string | null;
  ankiFate: AnkiFateOfDeletion | null;
  /** Whether the deletion waits for confirmation in its dialog. */
  isConfirmingDelete: boolean;
  onPlayAudio?: () => void;
  /** Brings the suspended flashcard back into the review. Null, the default, for a flashcard that is not suspended. */
  onUnsuspend?: (() => void) | null;
  /** Leaves the flashcard out of the review. The button shows only while the flashcard is not suspended. */
  onSuspend: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Flashcard from the library"
      className="flex h-full w-full flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-4 text-fg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-fg-muted">
          This flashcard was made from the library, so it can't be edited.
        </p>
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      {onUnsuspend && (
        <div className="overflow-hidden rounded-md border border-line">
          <SuspendedStrip onUnsuspend={onUnsuspend} />
        </div>
      )}
      <FlashcardPreview
        content={content}
        includedFields={settings.flashcard_fields}
        frontFields={settings.flashcard_front_fields}
        languages={languages}
        screenshotUrl={screenshotUrl}
        onPlayAudio={onPlayAudio}
      />
      <div className="flex flex-wrap gap-2">
        {!onUnsuspend && (
          <Button variant="subtle" onClick={onSuspend}>
            <CirclePause className="size-4" aria-hidden />
            Suspend
          </Button>
        )}
        <Button variant="danger" onClick={onAskDelete}>
          Delete flashcard
        </Button>
      </div>
      {isConfirmingDelete && (
        <FlashcardDeleteDialog
          word={content.word}
          ankiFate={ankiFate}
          onCancel={onCancelDelete}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}
