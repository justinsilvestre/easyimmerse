import type { LibraryItem } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../../components/common/Button.tsx";
import { FileField } from "../../components/common/FileField.tsx";
import {
  mediaFileTypes,
  subtitleFileTypes,
  textFileTypes,
} from "../../lib/library/libraryFileTypes.ts";
import type { LibrarySubtitleFiles } from "../../lib/library/libraryUploads.ts";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

/**
 * The file a library item was made from and, for a video or audio item, its subtitles, each of which can be replaced
 * from a fold that names what it replaces. Neither can change while the item is being prepared or is published.
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
  const fileName = item.file_name;
  return (
    <section aria-label="Files" className="flex flex-col gap-3">
      <h2 className="font-semibold">Files</h2>
      <p className="text-sm text-fg-muted">
        {fileName === null
          ? "No file is uploaded yet."
          : `Made from ${fileName}, in ${item.segment_count} ${isMedia ? "lines" : "paragraphs"}.`}
      </p>
      {lock ? (
        <p className="text-sm text-fg-muted">
          {libraryLockText(lock, "replace its files")}
        </p>
      ) : (
        <>
          <Replacement
            summary={
              fileName === null ? "Upload the file" : `Replace ${fileName}`
            }
          >
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
                hint={
                  isMedia
                    ? "The lines and their words stay as they are."
                    : "Replaces the paragraphs and the words set in them."
                }
                required
              />
              <Button type="submit" aria-disabled={isUploading || undefined}>
                Upload
              </Button>
            </form>
          </Replacement>
          {isMedia && (
            <Replacement summary="Replace the subtitles">
              <SubtitlesForm
                isUploading={isUploading}
                onReplaceSubtitles={onReplaceSubtitles}
              />
            </Replacement>
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

/** A fold whose summary names what the form inside it replaces. */
function Replacement({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-md border border-line px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">
        {summary}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function SubtitlesForm({
  isUploading,
  onReplaceSubtitles,
}: {
  isUploading: boolean;
  onReplaceSubtitles: (files: LibrarySubtitleFiles) => void;
}) {
  return (
    <form
      aria-label="Replace the subtitles"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const target = form.get("subtitles");
        const translation = form.get("translationSubtitles");
        if (!(target instanceof File) || target.size === 0 || isUploading)
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
  );
}
