import type { MediaFile } from "@easyimmerse/types";
import { Button } from "./Button.tsx";

export function MediaFileList({
  mediaFiles,
  currentMediaFileId,
  addPending,
  onOpen,
  onAdd,
  onRemove,
}: {
  mediaFiles: readonly MediaFile[];
  /** The id of the file the player shows, highlighted in the list. */
  currentMediaFileId: string | null;
  /** Disables the Add button while a file is being picked or sent to the server. */
  addPending: boolean;
  onOpen: (mediaFileId: string) => void;
  onAdd: () => void;
  onRemove: (mediaFileId: string) => void;
}) {
  return (
    <section aria-label="Media" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg-muted">Media</h2>
        <Button disabled={addPending} onClick={onAdd}>
          Add media
        </Button>
      </div>
      {mediaFiles.length === 0 ? (
        <p className="text-sm text-fg-muted">No media files yet.</p>
      ) : (
        <ul aria-label="Media files" className="flex flex-col gap-1">
          {mediaFiles.map((mediaFile) => (
            <MediaFileItem
              key={mediaFile.id}
              mediaFile={mediaFile}
              open={mediaFile.id === currentMediaFileId}
              onOpen={() => onOpen(mediaFile.id)}
              onRemove={() => onRemove(mediaFile.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MediaFileItem({
  mediaFile,
  open,
  onOpen,
  onRemove,
}: {
  mediaFile: MediaFile;
  open: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2">
      <Button
        variant={open ? "primary" : "secondary"}
        aria-current={open ? "true" : undefined}
        onClick={onOpen}
      >
        {mediaFile.name}
      </Button>
      <Button
        variant="subtle"
        aria-label={`Remove ${mediaFile.name}`}
        onClick={onRemove}
      >
        Remove
      </Button>
    </li>
  );
}
