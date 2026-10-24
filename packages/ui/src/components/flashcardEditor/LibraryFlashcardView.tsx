import type { AnkiFateOfDeletion } from "@easyimmerse/state";
import type { FlashcardContent, ProjectSettings } from "@easyimmerse/types";
import { X } from "lucide-react";
import { Button } from "../common/Button.tsx";
import { IconButton } from "../common/IconButton.tsx";
import { FlashcardDeleteDialog } from "../flashcards/FlashcardDeleteDialog.tsx";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { SuspendedStrip } from "./SuspendedStrip.tsx";

/**
 * A flashcard made from a library item, shown as it is reviewed rather than in the editor, since the server fills it and refuses changes.
 * It can be closed, brought back into the review while suspended, or deleted after confirming.
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
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Flashcard"
      className="flex h-full w-full flex-col rounded-lg border border-line bg-surface text-fg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <h2 className="font-semibold">Flashcard</h2>
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      {onUnsuspend && <SuspendedStrip onUnsuspend={onUnsuspend} />}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <p className="text-sm text-fg-muted">
          This flashcard was made from the library, so it can't be edited.
        </p>
        <FlashcardPreview
          content={content}
          includedFields={settings.flashcard_fields}
          frontFields={settings.flashcard_front_fields}
          languages={languages}
          screenshotUrl={screenshotUrl}
          onPlayAudio={onPlayAudio}
        />
      </div>
      <div className="flex justify-start border-t border-line px-4 py-2">
        <Button variant="danger" onClick={onAskDelete}>
          Delete
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
