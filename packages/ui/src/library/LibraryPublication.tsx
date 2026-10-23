import type { LibraryItem } from "@easyimmerse/types";
import { useState } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { libraryStatusLabels } from "./libraryLabels.ts";

const statusTones = {
  draft: "neutral",
  processing: "info",
  published: "success",
  failed: "danger",
} as const;

/** What each status tells the library manager. */
const statusTexts = {
  draft: "Learners can't see the item until it is published.",
  processing:
    "The server is preparing a clip and a screenshot for every line. The item is shown to learners once that is done.",
  published:
    "Learners can see the item. Flashcards they made from it are kept if it is unpublished.",
  failed: "The item could not be prepared for publishing.",
};

/**
 * Where a library item stands, with why its last publishing failed, and the actions that move it on:
 * "Propose words", which fills the lines that have no words from the manager's dictionaries, "Publish", "Unpublish",
 * and "Delete", which asks for confirmation first.
 */
export function LibraryPublication({
  item,
  isBusy,
  onProposeWords,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  item: LibraryItem;
  /** Whether an action is under way, while which the buttons do nothing. */
  isBusy: boolean;
  onProposeWords: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
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
      <p className="text-sm text-fg-muted">{statusTexts[status.kind]}</p>
      {status.kind === "failed" && (
        <p role="alert" className="text-sm text-danger-fg">
          {status.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {isEditable && (
          <>
            <Button
              aria-disabled={isBusy || undefined}
              onClick={act(onProposeWords)}
            >
              Propose words
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
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          Delete
        </Button>
      </div>
      {isConfirmingDelete && (
        <fieldset
          aria-label={`Delete ${item.title}?`}
          className="flex flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
        >
          <p className="flex-1">
            {`Delete ${item.title} from the library? Learners who added it keep their flashcards, but can no longer play or read it.`}
          </p>
          <Button size="sm" variant="danger" onClick={act(onDelete)}>
            Delete item
          </Button>
          <Button size="sm" onClick={() => setConfirmingDelete(false)}>
            Keep
          </Button>
        </fieldset>
      )}
    </section>
  );
}
