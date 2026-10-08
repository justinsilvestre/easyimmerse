import {
  useAddMediaFileMutation,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import type { PickedMediaFile } from "@easyimmerse/state";
import { actions, selectChosenMediaFile } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Sends the media file the user picked to the project through the backend, then opens it.
 * A file with the name of one already in the project is not sent again: that one opens instead, with a notice saying so.
 * The pick itself is an effect; the store only holds the result until this hook has sent it.
 */
export function useAddChosenMediaFile(projectId: string): void {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenMediaFile);
  const { data: list, isLoading } = useListMediaFilesQuery(projectId);
  const [addMediaFile] = useAddMediaFileMutation();
  // Strict mode runs effects twice, and the same chosen file must be sent only once.
  const sent = useRef<PickedMediaFile | null>(null);
  useEffect(() => {
    // The list is needed to tell a file already in the project; one that fails to load lets the file be sent anyway.
    if (chosen === null || sent.current === chosen || isLoading) return;
    sent.current = chosen;
    const existing = list?.media_files.find(({ name }) => name === chosen.name);
    if (existing) {
      // Opens the file in the project and forgets the chosen one, as if it had just been added.
      dispatch(actions.mediaFileAdded(existing.id));
      dispatch(
        actions.notificationRequested(
          `“${chosen.name}” is already in the project.`,
        ),
      );
      return;
    }
    addMediaFile({ projectId, request: chosen })
      .unwrap()
      .then((mediaFile) => dispatch(actions.mediaFileAdded(mediaFile.id)))
      .catch(() => dispatch(actions.mediaFileAddFailed()));
  }, [chosen, list, isLoading, projectId, addMediaFile, dispatch]);
}
