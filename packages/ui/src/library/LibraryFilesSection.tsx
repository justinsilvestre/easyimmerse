import type { LibraryItem } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { FileField } from "./FileField.tsx";
import {
  mediaFileTypes,
  subtitleFileTypes,
  textFileTypes,
} from "./libraryFileTypes.ts";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

/** Subtitle files that replace a video or audio item's text. */
export type LibrarySubtitleFiles = { target: File; translation: File | null };

/**
 * The file a library item was made from, which can be replaced, and for a video or audio item its subtitles, which can be replaced too,
 * replacing the item's words. Neither can change while the item is being prepared or is published.
 */
export function LibraryFilesSection({
  item,
  isUploading,
  onReplaceFile,
  onReplaceSubtitles,
}: {
  item: LibraryItem;
  isUploading: boolean;
  onReplaceFile: (file: File) => void;
  onReplaceSubtitles: (files: LibrarySubtitleFiles) => void;
}) {
  const lock = libraryLockOf(item.status);
  const isMedia = item.kind !== "document";
  return (
    <section aria-label="Files" className="flex flex-col gap-4">
      <h2 className="font-semibold">Files</h2>
      <p className="text-sm text-fg-muted">
        {item.file_name === null
          ? "No file is uploaded yet."
          : `Made from ${item.file_name}, in ${item.segment_count} ${isMedia ? "lines" : "paragraphs"}.`}
      </p>
      {lock ? (
        <p className="text-sm text-fg-muted">
          {libraryLockText(lock, "change its file, subtitles, or words")}
        </p>
      ) : (
        <>
          <form
            aria-label="Replace the file"
            className="flex flex-wrap items-end gap-3"
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
              required
            />
            <Button type="submit" aria-disabled={isUploading || undefined}>
              Upload
            </Button>
          </form>
          {isMedia && (
            <form
              aria-label="Replace the subtitles"
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const target = form.get("subtitles");
                const translation = form.get("translationSubtitles");
                if (
                  !(target instanceof File) ||
                  target.size === 0 ||
                  isUploading
                )
                  return;
                onReplaceSubtitles({
                  target,
                  translation:
                    translation instanceof File && translation.size > 0
                      ? translation
                      : null,
                });
              }}
            >
              <FileField
                label="Subtitles file"
                name="subtitles"
                accept={subtitleFileTypes}
                hint="Replaces the item's lines and the words set in them."
                required
              />
              <FileField
                label="Translation subtitles file"
                name="translationSubtitles"
                accept={subtitleFileTypes}
                hint="Optional."
              />
              <Button type="submit" aria-disabled={isUploading || undefined}>
                Upload subtitles
              </Button>
            </form>
          )}
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
