import { useAddSubtitleTrackMutation } from "@easyimmerse/backend";
import type { PickedFile } from "@easyimmerse/state";
import { actions, selectPendingSubtitleFile } from "@easyimmerse/state";
import type { SubtitleSelection } from "@easyimmerse/types";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { roleForNewTrack } from "./roleForNewTrack.ts";

/**
 * Sends the subtitles file the user picked to the open media file through the backend, and shows it at once.
 * The pick itself is an effect; the store only holds the result until this hook has sent it.
 */
export function useAddChosenSubtitleFile(
  projectId: string,
  mediaFileId: string,
  selection: SubtitleSelection | undefined,
): void {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectPendingSubtitleFile);
  const [addSubtitleTrack] = useAddSubtitleTrackMutation();
  // Strict mode runs effects twice, and the same chosen file must be sent only once.
  const sent = useRef<PickedFile | null>(null);
  useEffect(() => {
    if (chosen === null || selection === undefined || sent.current === chosen)
      return;
    sent.current = chosen;
    addSubtitleTrack({
      projectId,
      mediaFileId,
      request: {
        name: chosen.name,
        source: chosen.source,
        format: null,
        role: roleForNewTrack(selection),
      },
    })
      .unwrap()
      .then(() => dispatch(actions.subtitleFileAdded()))
      .catch(() => dispatch(actions.subtitleFileAddFailed()));
  }, [chosen, selection, projectId, mediaFileId, addSubtitleTrack, dispatch]);
}
