import type { LibraryItem } from "@easyimmerse/types";
import { useState } from "react";
import { Button } from "../../components/common/Button.tsx";
import { FileField } from "../../components/common/FileField.tsx";
import { coverFileTypes } from "../../lib/library/libraryFileTypes.ts";
import { formatLibraryDuration } from "../../lib/library/libraryLabels.ts";
import {
  automaticCoverLabel,
  isEpub,
  libraryCoverDescription,
} from "./libraryCoverText.ts";

/**
 * The cover picture of a library item, which changes at once: a picture the manager uploads, a frame of a video picked in its preview,
 * or the automatic cover, which is the first line's screenshot for a video and the book's own cover for an EPUB file.
 * The cover cannot change while the item is being prepared.
 */
export function LibraryCoverPicker({
  item,
  coverUrl,
  previewUrl,
  isChanging,
  onUpload,
  onChooseFrame,
  onReset,
}: {
  item: LibraryItem;
  /** The image of the item's cover, or null when it has none to show. */
  coverUrl: string | null;
  /** The address of the item's uploaded video, which a frame is picked from, or null when it cannot be played here. */
  previewUrl: string | null;
  isChanging: boolean;
  onUpload: (file: File) => void;
  onChooseFrame: (atMs: number) => void;
  /** Gives the item its automatic cover again. */
  onReset: () => void;
}) {
  const resetLabel = automaticCoverLabel(item);
  const isProcessing = item.status.kind === "processing";
  return (
    <section aria-label="Cover picture" className="flex flex-col gap-3">
      <h2 className="font-semibold">Cover picture</h2>
      {coverUrl && (
        <img
          src={coverUrl}
          alt="The cover"
          className="aspect-video w-full max-w-xs rounded-md bg-surface-muted object-cover"
        />
      )}
      <p className="text-sm text-fg-muted">{libraryCoverDescription(item)}</p>
      {isProcessing ? (
        <p className="text-sm text-fg-muted">
          {`Wait until the server has prepared “${item.title}” for learners to change its cover.`}
        </p>
      ) : (
        <>
          <form
            aria-label="Upload a cover"
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const file = new FormData(event.currentTarget).get("cover");
              if (file instanceof File && file.size > 0 && !isChanging)
                onUpload(file);
            }}
          >
            <FileField
              label="Picture"
              name="cover"
              accept={coverFileTypes}
              hint="A JPEG, PNG, GIF or WebP picture."
              required
            />
            <Button type="submit" aria-disabled={isChanging || undefined}>
              Upload picture
            </Button>
          </form>
          {item.kind === "video" && previewUrl && (
            <FramePicker
              previewUrl={previewUrl}
              isChanging={isChanging}
              onChoose={onChooseFrame}
            />
          )}
          {resetLabel && (
            <div className="flex flex-col gap-1">
              <div>
                <Button
                  size="sm"
                  variant="subtle"
                  aria-disabled={isChanging || undefined}
                  onClick={() => {
                    if (!isChanging) onReset();
                  }}
                >
                  {resetLabel}
                </Button>
              </div>
              {isEpub(item) && (
                <p className="text-xs text-fg-muted">
                  If the EPUB file has no cover, the text is left without a
                  picture.
                </p>
              )}
            </div>
          )}
        </>
      )}
      {isChanging && (
        <p role="status" className="text-sm text-fg-muted">
          Changing the cover…
        </p>
      )}
    </section>
  );
}

/** A preview of the video, paused or sought to the frame that is to become the cover. */
function FramePicker({
  previewUrl,
  isChanging,
  onChoose,
}: {
  previewUrl: string;
  isChanging: boolean;
  onChoose: (atMs: number) => void;
}) {
  // The time the preview shows changes with every frame, so it stays in the component rather than the store.
  const [shownMs, setShownMs] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      {/* biome-ignore lint/a11y/useMediaCaption: the preview only serves to find the frame of the cover */}
      <video
        src={previewUrl}
        controls
        preload="metadata"
        aria-label="Preview"
        onTimeUpdate={(event) =>
          setShownMs(Math.round(event.currentTarget.currentTime * 1000))
        }
        className="aspect-video w-full max-w-md rounded-md bg-black"
      />
      <div>
        <Button
          size="sm"
          aria-disabled={isChanging || undefined}
          onClick={() => {
            if (!isChanging) onChoose(shownMs);
          }}
        >
          {`Use the frame at ${formatLibraryDuration(shownMs)}`}
        </Button>
      </div>
    </div>
  );
}
