import type { LibraryItem } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { FileField } from "../../components/common/FileField.tsx";
import { pluralize } from "../../lib/formatting/pluralize.ts";
import {
  mediaFileTypes,
  textFileTypes,
} from "../../lib/library/libraryFileTypes.ts";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

/**
 * The file a library item was made from, which can be replaced from a fold that names it,
 * and for a video or audio item, where its subtitles are chosen. The file cannot change while the item is being prepared or is published.
 */
export function LibraryFilesSection({
  item,
  isUploading,
  onReplaceFile,
}: {
  item: LibraryItem;
  isUploading: boolean;
  onReplaceFile: (file: File) => void;
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
          <details className="rounded-md border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              {fileName === null ? "Upload the file" : `Replace ${fileName}`}
            </summary>
            <form
              aria-label="Replace the file"
              className="flex flex-wrap items-end gap-3 pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                const file = new FormData(event.currentTarget).get("file");
                if (file instanceof File && file.size > 0 && !isUploading)
                  onReplaceFile(file);
              }}
            >
              <FileField
                label={isMedia ? "Video or audio file" : "Text file"}
                name="file"
                accept={isMedia ? mediaFileTypes : textFileTypes}
                hint={
                  isMedia
                    ? "The subtitles and their words stay as they are."
                    : "Replaces the paragraphs and the words set in them."
                }
                required
              />
              <Button type="submit" aria-disabled={isUploading || undefined}>
                Upload
              </Button>
            </form>
          </details>
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
