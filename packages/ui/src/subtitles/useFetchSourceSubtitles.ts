import {
  type BackendError,
  useFetchSourceSubtitlesMutation,
  useLazyListSourceSubtitlesQuery,
} from "@easyimmerse/backend";
import type { MediaFile } from "@easyimmerse/types";
import { useState } from "react";
import { skippedSubtitlesMessage } from "../projects/skippedSubtitlesMessage.ts";

/**
 * The dialog for fetching more subtitles from a fetched media file's source: whether it
 * shows, the tracks the source offers once asked, and the fetch. A media file that no
 * plugin fetched has no source, so the dialog cannot open for it. When a chosen track is
 * not added, the dialog stays open and says why.
 */
export function useFetchSourceSubtitles(
  projectId: string,
  mediaFile: MediaFile | null,
) {
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, listed] = useLazyListSourceSubtitlesQuery();
  const [fetchSubtitles, { isLoading: isFetching }] =
    useFetchSourceSubtitlesMutation();
  const mediaFileId = mediaFile?.id ?? null;
  const hasSource = mediaFile?.origin != null;
  const args = mediaFileId === null ? null : { projectId, mediaFileId };
  return {
    isOpen: isOpen && hasSource,
    subtitles: listed.data?.subtitles ?? null,
    error: error ?? messageOf(listed.error),
    isFetching,
    open: hasSource
      ? () => {
          if (args === null) return;
          setError(null);
          setOpen(true);
          list(args);
        }
      : null,
    close: () => setOpen(false),
    fetch: (subtitles: string[]) => {
      if (args === null) return;
      setError(null);
      fetchSubtitles({ ...args, subtitles })
        .unwrap()
        .then(({ skipped }) => {
          const message = skippedSubtitlesMessage(
            skipped,
            listed.data?.subtitles ?? [],
          );
          if (message === null) setOpen(false);
          else setError(message);
        })
        .catch((failure: BackendError) =>
          setError(failure.message ?? "The subtitles could not be fetched."),
        );
    },
  };
}

function messageOf(error: unknown): string | null {
  if (error === undefined || error === null) return null;
  const message = (error as Partial<BackendError>).message;
  return message ?? "The source's subtitles could not be listed.";
}
