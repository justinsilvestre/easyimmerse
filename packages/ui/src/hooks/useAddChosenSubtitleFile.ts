import { useAddSubtitleFileMutation } from "@easyimmerse/backend";
import type { AppState, SubtitleRole } from "@easyimmerse/state";
import { actions, selectChosenSubtitleFile } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Adds the subtitles file the user picked to the media file through the backend, filed under the
 * language of the role it was picked for, then reports it so that it can be shown in that role.
 */
export function useAddChosenSubtitleFile(
  projectId: string,
  mediaFileId: string,
  languages: Record<SubtitleRole, string>,
  onAdded: (role: SubtitleRole, subtitleFileId: string) => void,
): void {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenSubtitleFile);
  const [addSubtitleFile] = useAddSubtitleFileMutation();
  const latest = useRef({ languages, onAdded });
  latest.current = { languages, onAdded };
  // Strict mode runs effects twice, and the same chosen file must be sent only once.
  const sent = useRef<AppState["chosenSubtitleFile"]>(null);
  useEffect(() => {
    if (chosen === null || sent.current === chosen) return;
    sent.current = chosen;
    const { file, role } = chosen;
    addSubtitleFile({
      projectId,
      mediaFileId,
      request: {
        name: file.name,
        source: file.source,
        format: null,
        language: latest.current.languages[role],
      },
    })
      .unwrap()
      .then((added) => {
        dispatch(actions.subtitleFileAdded());
        latest.current.onAdded(role, added.id);
      })
      .catch(() => dispatch(actions.subtitleFileAddFailed()));
  }, [chosen, projectId, mediaFileId, addSubtitleFile, dispatch]);
}
