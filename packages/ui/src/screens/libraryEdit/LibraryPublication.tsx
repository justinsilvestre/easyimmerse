import type { LibraryItem } from "@easyimmerse/types";
import { Badge } from "../../components/common/Badge.tsx";
import { Button } from "../../components/common/Button.tsx";
import { ModalDialog } from "../../components/common/ModalDialog.tsx";
import { libraryStatusLabels } from "../../lib/library/libraryLabels.ts";
import {
  libraryDeletionText,
  libraryStatusText,
} from "./libraryPublicationTexts.ts";

const statusTones = {
  draft: "neutral",
  processing: "info",
  published: "success",
  failed: "danger",
} as const;

/**
 * Where a library item stands, with what that means for learners and why its last publishing failed, and the actions that move it on:
 * "Fill in words from your dictionaries", which fills the subtitles that have no words yet, "Publish", "Unpublish",
 * and "Delete", which asks for confirmation in a dialog first and is not offered while the item is being prepared.
 */
export function LibraryPublication({
  item,
  isBusy,
  onProposeWords,
  onPublish,
  onUnpublish,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  item: LibraryItem;
  /** Whether an action is under way, while which the buttons do nothing. */
  isBusy: boolean;
  onProposeWords: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  /** Whether the deletion waits for confirmation. */
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const { status } = item;
  const isEditable = status.kind === "draft" || status.kind === "failed";
  const act = (action: () => void) => () => {
    if (!isBusy) action();
  };
  return (
    <section aria-label="Publishing" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Status</h2>
        <Badge tone={statusTones[status.kind]}>
          {libraryStatusLabels[status.kind]}
        </Badge>
      </div>
      <p
        role={status.kind === "failed" ? "alert" : undefined}
        className={
          status.kind === "failed"
            ? "text-sm text-danger-fg"
            : "text-sm text-fg-muted"
        }
      >
        {libraryStatusText(status.kind, item.kind)}
      </p>
      {status.kind === "failed" && (
        <details className="text-sm text-fg-muted">
          <summary className="cursor-pointer">What the server reported</summary>
          <p className="mt-1">{status.message}</p>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        {isEditable && (
          <>
            <Button
              aria-disabled={isBusy || undefined}
              onClick={act(onProposeWords)}
            >
              Fill in words from your dictionaries
            </Button>
            <Button
              variant="primary"
              aria-disabled={isBusy || item.file_name === null || undefined}
              onClick={act(() => {
                if (item.file_name !== null) onPublish();
              })}
            >
              Publish
            </Button>
          </>
        )}
        {status.kind === "published" && (
          <Button
            aria-disabled={isBusy || undefined}
            onClick={act(onUnpublish)}
          >
            Unpublish
          </Button>
        )}
        {status.kind !== "processing" && (
          <Button variant="danger" onClick={onAskDelete}>
            Delete
          </Button>
        )}
      </div>
      {isConfirmingDelete && status.kind !== "processing" && (
        <ModalDialog
          title={`Delete “${item.title}”?`}
          description={libraryDeletionText(item.kind)}
          onCancel={onCancelDelete}
          footer={
            <>
              <Button autoFocus onClick={onCancelDelete}>
                Cancel
              </Button>
              <Button variant="danger" onClick={act(onDelete)}>
                Delete
              </Button>
            </>
          }
        />
      )}
    </section>
  );
}
