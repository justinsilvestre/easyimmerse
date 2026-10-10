import {
  skipToken,
  useGetSubtitleCuesQuery,
  useListSubtitleTracksQuery,
  useSetSubtitleSelectionMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  Cue,
  SubtitleRole,
  SubtitleSelection,
  SubtitleTrack,
} from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { SubtitleTrackOption } from "../media/SubtitleTrackChoices.ts";
import { useAddChosenSubtitleFile } from "./useAddChosenSubtitleFile.ts";

const noCues: readonly Cue[] = [];

const noSelection: SubtitleSelection = {
  target_track_id: null,
  translation_track_id: null,
};

/** The subtitle tracks of a media file, which of them show, their cues, and the ways to change them. */
export function useMediaSubtitles(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const args = { projectId, mediaFileId };
  const list = useListSubtitleTracksQuery(args);
  const selection = list.data?.selection ?? noSelection;
  const target = useCues(args, selection.target_track_id);
  const translation = useCues(args, selection.translation_track_id);
  const [setSelection] = useSetSubtitleSelectionMutation();
  useAddChosenSubtitleFile(projectId, mediaFileId, list.data?.selection);
  const choose = (role: SubtitleRole, trackId: string | null) =>
    setSelection({
      ...args,
      selection: { ...selection, [`${role}_track_id`]: trackId },
    })
      .unwrap()
      .catch(() =>
        dispatch(
          actions.notificationRequested("The subtitles could not be changed"),
        ),
      );
  return {
    options: (list.data?.tracks ?? []).map(optionOf),
    selection,
    cues: target.cues,
    translationCues: translation.cues,
    hasFailed: list.isError || target.hasFailed || translation.hasFailed,
    choose,
    requestFile: () => dispatch(actions.subtitleFilePickRequested()),
  };
}

function useCues(
  args: { projectId: string; mediaFileId: string },
  trackId: string | null,
) {
  const { data, isError } = useGetSubtitleCuesQuery(
    trackId === null ? skipToken : { ...args, trackId },
  );
  return {
    cues: trackId === null ? noCues : (data?.cues ?? noCues),
    hasFailed: trackId !== null && isError,
  };
}

function optionOf(track: SubtitleTrack): SubtitleTrackOption {
  return {
    id: track.id,
    label: track.name,
    language: null,
    sample: track.sample,
  };
}
