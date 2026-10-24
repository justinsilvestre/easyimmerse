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
import type { LibraryItemText } from "../../components/wordLookup/libraryWords.ts";
import type { Range } from "../../components/wordLookup/RunText.tsx";
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
 * While a library manager prepares the item, every word can be clicked, and the stored words are marked instead.
 */
export function useMediaSubtitles(
  projectId: string,
  mediaFileId: string,
  library?: Pick<LibraryItemText, "text" | "isEditing">,
) {
  const libraryText = library?.text;
  const dispatch = useAppDispatch();
  const args = { projectId, mediaFileId };
  const list = useListSubtitleTracksQuery(libraryText ? skipToken : args);
  const selection = list.data?.selection ?? noSelection;
  const target = useCues(args, selection.target_track_id);
  const translation = useCues(args, selection.translation_track_id);
  const fromLibrary = useMemo(
    () =>
      libraryText && {
        ...cuesOfLibraryText(libraryText),
        words: libraryWordsByCue(libraryText),
      },
    [libraryText],
  );
  const isEditing = library?.isEditing ?? false;
  const markedWords = useMemo(
    () => (isEditing && libraryText ? rangesByCue(libraryText) : undefined),
    [isEditing, libraryText],
  );
  const choose = (role: SubtitleRole, trackId: string | null) =>
    dispatch(actions.subtitleTrackChosen(role, trackId, selection));
  return {
    options: (list.data?.tracks ?? []).map(optionOf),
    selection,
    cues: fromLibrary?.cues ?? target.cues,
    translationCues: fromLibrary?.translationCues ?? translation.cues,
    /** The words of each cue that alone are clickable, by cue index, for a file from the library that learners use. */
    libraryWords: isEditing ? undefined : fromLibrary?.words,
    /** The words stored in each cue, by cue index, which are marked while a library manager prepares the item. */
    markedWords,
    hasFailed: list.isError || target.hasFailed || translation.hasFailed,
    choose,
    requestFile: () => dispatch(actions.subtitleFilePickRequested()),
  };
}

/** The stored words of each segment of a library item's text, as ranges of its text, by the index of the cue the segment makes. */
function rangesByCue(text: LibraryText): ReadonlyMap<number, Range[]> {
  return new Map(
    text.segments.map(({ index, words }) => [
      index,
      words.map(({ start, end }) => ({ from: start, to: end })),
    ]),
  );
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
