import {
  skipToken,
  useGetEmbeddedSubtitlesQuery,
  useListSubtitleFilesQuery,
  useListSubtitleTracksQuery,
  useSaveSubtitleSelectionMutation,
} from "@easyimmerse/backend";
import type { SubtitleRole } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type {
  Cue,
  MediaFile,
  ProjectSettings,
  SubtitleSelection,
} from "@easyimmerse/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import type { TrackOption } from "../../media/playback.ts";
import {
  buildSubtitleTrackOptions,
  loneTrackIn,
  streamIndexOf,
} from "./subtitleTrackOptions.ts";

const noCues: readonly Cue[] = [];

/** The subtitle tracks of a media file, the ones shown, and their cues. */
export type Subtitles = {
  options: readonly TrackOption[];
  selection: SubtitleSelection;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  /** Asks which track to show, when the file has tracks but none could be chosen on its own. */
  prompt: { role: SubtitleRole; options: readonly TrackOption[] } | null;
  choose: (role: SubtitleRole, trackId: string | null) => void;
  dismissPrompt: () => void;
};

/**
 * Lists the subtitle tracks inside a media file and the subtitles files added to it, and keeps the
 * user's choice of target and translation subtitles on the server. When nothing is chosen yet, a lone
 * track in the language is chosen on its own, and otherwise the user is asked once per opening.
 */
export function useSubtitles(
  projectId: string,
  mediaFile: MediaFile,
  settings: ProjectSettings,
): Subtitles {
  const args = { projectId, mediaFileId: mediaFile.id };
  const embedded = useListSubtitleTracksQuery(
    mediaFile.source.kind === "path" ? args : skipToken,
  );
  const files = useListSubtitleFilesQuery(args);
  const options = useMemo(
    () =>
      buildSubtitleTrackOptions(
        embedded.data?.tracks ?? [],
        files.data?.subtitle_files ?? [],
      ),
    [embedded.data, files.data],
  );
  const [selection, choose] = useSelection(projectId, mediaFile);
  const isListed = files.data !== undefined && !embedded.isFetching;
  const prompt = useAutomaticChoice({
    options: isListed ? options : null,
    selection,
    settings,
    choose,
  });
  return {
    options,
    selection,
    cues: useTrackCues(args, selection.target, files.data?.subtitle_files),
    translationCues: useTrackCues(
      args,
      selection.translation,
      files.data?.subtitle_files,
    ),
    prompt: prompt.current,
    choose: (role, trackId) => {
      prompt.dismiss();
      choose(role, trackId);
    },
    dismissPrompt: prompt.dismiss,
  };
}

/**
 * The subtitles shown, starting from the saved choice, and the function that changes and saves it.
 * The latest choice is also kept in a ref, so that two roles chosen at once both stay chosen.
 */
function useSelection(projectId: string, mediaFile: MediaFile) {
  const dispatch = useAppDispatch();
  const [save] = useSaveSubtitleSelectionMutation();
  const [selection, setSelection] = useState(mediaFile.subtitle_selection);
  const latest = useRef(selection);
  // Each save waits for the one before, so that the server keeps the last choice.
  const saves = useRef<Promise<unknown>>(Promise.resolve());
  const choose = useCallback(
    (role: SubtitleRole, trackId: string | null) => {
      const next = { ...latest.current, [role]: trackId };
      latest.current = next;
      setSelection(next);
      saves.current = saves.current
        .then(() =>
          save({
            projectId,
            mediaFileId: mediaFile.id,
            selection: next,
          }).unwrap(),
        )
        .catch(() =>
          dispatch(
            actions.notificationRequested(
              "The subtitles choice could not be saved",
            ),
          ),
        );
    },
    [projectId, mediaFile.id, save, dispatch],
  );
  return [selection, choose] as const;
}

/** The cues of a track: a subtitles file's from the list, an embedded track's extracted by the server. */
function useTrackCues(
  args: { projectId: string; mediaFileId: string },
  trackId: string | null,
  files: readonly { id: string; cues: readonly Cue[] }[] | undefined,
): readonly Cue[] {
  const streamIndex = streamIndexOf(trackId);
  const { data } = useGetEmbeddedSubtitlesQuery(
    streamIndex === null ? skipToken : { ...args, streamIndex },
  );
  if (trackId === null) return noCues;
  if (streamIndex !== null) return data?.cues ?? noCues;
  return files?.find((file) => `file:${file.id}` === trackId)?.cues ?? noCues;
}

/**
 * Chooses a lone track in each role's language once the tracks are listed, and otherwise asks for the
 * target subtitles when there are tracks to choose from. Each role is decided at most once per opening.
 */
function useAutomaticChoice({
  options,
  selection,
  settings,
  choose,
}: {
  options: readonly TrackOption[] | null;
  selection: SubtitleSelection;
  settings: ProjectSettings;
  choose: (role: SubtitleRole, trackId: string | null) => void;
}) {
  const [decided, setDecided] = useState(false);
  const [prompting, setPrompting] = useState(false);
  useEffect(() => {
    if (options === null || decided) return;
    setDecided(true);
    if (selection.target !== null || selection.translation !== null) return;
    const target = loneTrackIn(options, settings.target_language);
    const translation = loneTrackIn(options, settings.translation_language);
    if (target) choose("target", target.id);
    if (translation) choose("translation", translation.id);
    if (!target && options.length > 0) setPrompting(true);
  }, [options, decided, selection, settings, choose]);
  return {
    current:
      prompting && options !== null
        ? { role: "target" as const, options }
        : null,
    dismiss: () => setPrompting(false),
  };
}
