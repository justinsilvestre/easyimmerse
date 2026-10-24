import type { LibraryItem } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { pluralize } from "../../lib/formatting/pluralize.ts";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

/**
 * The file a library item was made from, which a button replaces by one picked on this device,
 * and for a video or audio item, where its subtitles are chosen. The file cannot change while the item is being prepared or is published.
 */
export function LibraryFilesSection({
  item,
  isUploading,
  onReplaceFile,
}: {
  item: LibraryItem;
  isUploading: boolean;
  onReplaceFile: () => void;
}) {
  const lock = libraryLockOf(item.status);
  const isMedia = item.kind !== "document";
  const fileName = item.file_name;
  return (
    <section aria-label="Files" className="flex flex-col gap-3">
      <h2 className="font-semibold">Files</h2>
      <p className="text-sm text-fg-muted">
        {fileName === null
          ? "No file is uploaded yet."
          : `Made from ${fileName}, with ${pluralize(item.segment_count, isMedia ? "subtitle" : "paragraph")}.`}
      </p>
      {lock ? (
        <p className="text-sm text-fg-muted">
          {libraryLockText(lock, "replace its file", item.title)}
        </p>
      ) : (
        <>
          {isMedia && fileName !== null && (
            <p className="text-sm text-fg-muted">
              Its subtitles and their translation are chosen in the player's
              subtitles panel.
            </p>
          )}
          {fileName !== null && (
            <p className="text-sm text-fg-muted">
              {isMedia
                ? "The subtitles and their words stay as they are."
                : "Replaces the paragraphs and the words set in them."}
            </p>
          )}
          <div>
            <Button
              aria-disabled={isUploading || undefined}
              onClick={() => {
                if (!isUploading) onReplaceFile();
              }}
            >
              {fileName === null ? "Upload the file" : "Replace the file"}
            </Button>
          </div>
        </>
      )}
      {isUploading && (
        <p role="status" className="text-sm text-fg-muted">
          Uploading…
        </p>
      )}
    </section>
  );
}
