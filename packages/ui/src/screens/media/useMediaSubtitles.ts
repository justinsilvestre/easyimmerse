import {
  skipToken,
  useGetSubtitleCuesQuery,
  useListSubtitleTracksQuery,
} from "@easyimmerse/backend";
import { actions, cuesOfLibraryText } from "@easyimmerse/state";
import type {
  Cue,
  LibraryText,
  SubtitleRole,
  SubtitleSelection,
  SubtitleTrack,
} from "@easyimmerse/types";
import { useMemo } from "react";
import { libraryWordsByCue } from "../../components/cuePanel/libraryWordsByCue.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import type { SubtitleTrackOption } from "./SubtitleTrackChoices.ts";

const noCues: readonly Cue[] = [];

const noSelection: SubtitleSelection = {
  target_track_id: null,
  translation_track_id: null,
};

/**
 * The subtitle tracks of a media file, which of them show, their cues, and the ways to change them.
 * For a file from the library, given its item's text, the cues are the text's segments, with the words each stores, and no track can be chosen.
 */
export function useMediaSubtitles(
  projectId: string,
  mediaFileId: string,
  libraryText?: LibraryText,
) {
  const dispatch = useAppDispatch();
  const args = { projectId, mediaFileId };
  const list = useListSubtitleTracksQuery(libraryText ? skipToken : args);
  const selection = list.data?.selection ?? noSelection;
  const target = useCues(args, selection.target_track_id);
  const translation = useCues(args, selection.translation_track_id);
  const library = useMemo(
    () =>
      libraryText && {
        ...cuesOfLibraryText(libraryText),
        words: libraryWordsByCue(libraryText),
      },
    [libraryText],
  );
  const choose = (role: SubtitleRole, trackId: string | null) =>
    dispatch(actions.subtitleTrackChosen(role, trackId, selection));
  return {
    options: (list.data?.tracks ?? []).map(optionOf),
    selection,
    cues: library?.cues ?? target.cues,
    translationCues: library?.translationCues ?? translation.cues,
    /** The words of each cue that alone are clickable, by cue index, for a file from the library. */
    libraryWords: library?.words,
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
