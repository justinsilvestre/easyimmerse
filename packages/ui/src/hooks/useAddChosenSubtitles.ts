import { useAddSubtitleTrackMutation } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "./useAppDispatch.ts";
import type { ChosenFileHandler } from "./useChosenFileHandler.ts";

/** Returns a handler that adds a chosen subtitles file to the open media, in the role it was picked for. */
export function useAddChosenSubtitles(): ChosenFileHandler {
  const dispatch = useAppDispatch();
  const [addSubtitleTrack] = useAddSubtitleTrackMutation();
  return async ({ purpose, file }, screen) => {
    if (purpose.kind !== "subtitles" || screen.kind !== "media")
      throw new Error("Open a media file first.");
    const track = await addSubtitleTrack({
      projectId: screen.projectId,
      mediaId: screen.mediaId,
      track: {
        name: file.name,
        role: purpose.role,
        language: null,
        source: { kind: "file", source: file.source },
      },
    }).unwrap();
    dispatch(actions.subtitleTrackAdded(track));
  };
}
