import {
  actions,
  selectIsUploadChoiceChanging,
  selectStoredCopyDeletionToConfirm,
} from "@easyimmerse/state";
import type { StoredCopy } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { formatByteSize } from "../../lib/formatting/formatByteSize.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";

/** One copy a server keeps of a media file: its name, project and size, with a button that deletes it once the person confirms. */
export function StoredCopyRow({
  copy,
  host,
}: {
  copy: StoredCopy;
  host: string;
}) {
  const dispatch = useAppDispatch();
  const isDeleting = useAppSelector((state) =>
    selectIsUploadChoiceChanging(state, copy.media_file_id),
  );
  const isConfirming =
    useAppSelector(selectStoredCopyDeletionToConfirm) === copy.media_file_id;
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{copy.name}</span>
          <span className="text-xs text-fg-muted">
            {copy.project_name} · {formatByteSize(copy.size_bytes)}
          </span>
        </span>
        <Button
          size="sm"
          variant="danger"
          aria-label={`${isDeleting ? "Deleting" : "Delete"} ${copy.name} from ${host}`}
          aria-disabled={isDeleting || isConfirming || undefined}
          onClick={() => {
            if (!isDeleting)
              dispatch(actions.storedCopyDeletionAsked(copy.media_file_id));
          }}
        >
          {isDeleting ? "Deleting…" : `Delete from ${host}`}
        </Button>
      </div>
      {isConfirming && <DeletionConfirmation copy={copy} host={host} />}
    </li>
  );
}

function DeletionConfirmation({
  copy,
  host,
}: {
  copy: StoredCopy;
  host: string;
}) {
  const dispatch = useAppDispatch();
  return (
    <fieldset
      aria-label={`Delete ${copy.name} from ${host}?`}
      className="flex flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <p className="flex-1">
        Delete from {host}? {copy.name} stays on this device, if it is here.
      </p>
      <Button
        size="sm"
        variant="danger"
        onClick={() =>
          dispatch(
            actions.uploadChoiceToggled(
              copy.project_id,
              copy.media_file_id,
              false,
            ),
          )
        }
      >
        Delete
      </Button>
      <Button
        size="sm"
        onClick={() => dispatch(actions.storedCopyDeletionCancelled())}
      >
        Keep
      </Button>
    </fieldset>
  );
}
