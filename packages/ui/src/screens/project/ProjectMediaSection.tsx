import {
  useListFlashcardsQuery,
  useListMediaFilesQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAddChosenMediaFile } from "../../hooks/useAddChosenMediaFile.ts";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { MediaSection } from "../../projects/MediaSection.tsx";
import { mediaItemsOf } from "./mediaItemsOf.ts";

/** The project's media files from the server, with adding, opening, and removing them. */
export function ProjectMediaSection({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const mediaFiles = useListMediaFilesQuery(projectId);
  const flashcards = useListFlashcardsQuery(projectId);
  const [removeMediaFile] = useRemoveMediaFileMutation();
  useAddChosenMediaFile(projectId);
  if (mediaFiles.isLoading)
    return <p className="text-sm text-fg-muted">Loading the media…</p>;
  if (!mediaFiles.data)
    return <p role="alert">Could not load the media files.</p>;
  return (
    <MediaSection
      media={mediaItemsOf(
        mediaFiles.data.media_files,
        flashcards.data?.flashcards ?? [],
      )}
      onAddMedia={() => dispatch(actions.mediaFilePickRequested())}
      onOpenMedia={(mediaFileId) => dispatch(actions.openMedia(mediaFileId))}
      onDeleteMedia={(mediaFileId) => {
        removeMediaFile({ projectId, mediaFileId })
          .unwrap()
          .then(() => dispatch(actions.mediaFileRemoved(mediaFileId)))
          .catch(() =>
            dispatch(
              actions.notificationRequested(
                "The media file could not be removed",
              ),
            ),
          );
      }}
    />
  );
}
