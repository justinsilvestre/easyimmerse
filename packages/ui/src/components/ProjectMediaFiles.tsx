import {
  useListMediaFilesQuery,
  useRemoveMediaFileMutation,
} from "@easyimmerse/backend";
import {
  actions,
  selectChosenMediaFile,
  selectCurrentMediaFileId,
  selectPendingMediaFilePick,
} from "@easyimmerse/state";
import { useAddChosenMediaFile } from "../hooks/useAddChosenMediaFile.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaFileList } from "./MediaFileList.tsx";

/** The media files of a project, read from the backend, with the open file taken from the store. */
export function ProjectMediaFiles({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const currentMediaFileId = useAppSelector(selectCurrentMediaFileId);
  const pickPending = useAppSelector(selectPendingMediaFilePick);
  const chosen = useAppSelector(selectChosenMediaFile);
  const { data, error } = useListMediaFilesQuery(projectId);
  const [removeMediaFile] = useRemoveMediaFileMutation();
  useAddChosenMediaFile(projectId);
  if (error) return <p role="alert">Could not load the media files.</p>;
  return (
    <MediaFileList
      mediaFiles={data?.media_files ?? []}
      currentMediaFileId={currentMediaFileId}
      addPending={pickPending || chosen !== null}
      onOpen={(mediaFileId) => dispatch(actions.openMedia(mediaFileId))}
      onAdd={() => dispatch(actions.mediaFilePickRequested())}
      onRemove={(mediaFileId) => {
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
