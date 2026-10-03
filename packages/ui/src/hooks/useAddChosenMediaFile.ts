import { useAddMediaFileMutation } from "@easyimmerse/backend";
import type { PickedMediaFile } from "@easyimmerse/state";
import { actions, selectChosenMediaFile } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Sends the media file the user picked to the project through the backend, then opens it.
 * The pick itself is an effect; the store only holds the result until this hook has sent it.
 */
export function useAddChosenMediaFile(projectId: string): void {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenMediaFile);
  const [addMediaFile] = useAddMediaFileMutation();
  // Strict mode runs effects twice, and the same chosen file must be sent only once.
  const sent = useRef<PickedMediaFile | null>(null);
  useEffect(() => {
    if (chosen === null || sent.current === chosen) return;
    sent.current = chosen;
    addMediaFile({ projectId, request: chosen })
      .unwrap()
      .then((mediaFile) => dispatch(actions.mediaFileAdded(mediaFile.id)))
      .catch(() => dispatch(actions.mediaFileAddFailed()));
  }, [chosen, projectId, addMediaFile, dispatch]);
}
