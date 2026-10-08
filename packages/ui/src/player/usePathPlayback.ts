import {
  getServerConfig,
  skipToken,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
  useSaveTrackSelectionMutation,
} from "@easyimmerse/backend";
import {
  actions,
  selectPreference,
  selectPreferencesLoaded,
} from "@easyimmerse/state";
import type {
  AudioTarget,
  MediaFile,
  TrackSelection,
} from "@easyimmerse/types";
import { useCallback, useMemo, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { derivePlayerStatus } from "./derivePlayerStatus.ts";
import {
  measurePlaybackEnvironment,
  readPlaybackProbes,
} from "./measurePlaybackEnvironment.ts";
import type { PlayerStatus } from "./PlayerStatus.ts";
import {
  containerCodecStrings,
  needsTrackChoice,
  parseTrackSelection,
  tracksOfKind,
} from "./playbackPlanRules.ts";
import { trackChoiceOf } from "./trackChoiceOf.ts";

/** Whether the dialog is yet to be decided for this file, opened by the user, or put away. */
type TrackDialog = "undecided" | "open" | "closed";

/**
 * Resolves how a file on the server's disk plays: probes its tracks, measures the browser, asks the server
 * for a plan with the saved track selection and the lossless-audio preference, and raises the track choice
 * and conversion notice dialogs when they are due.
 */
export function usePathPlayback(projectId: string, mediaFile: MediaFile) {
  const dispatch = useAppDispatch();
  const mediaFileId = mediaFile.id;
  const tracks = useGetMediaTracksQuery({ projectId, mediaFileId });
  const [selection, setSelection] = useState(() =>
    parseTrackSelection(mediaFile.track_selection_json),
  );
  const [trackDialog, setTrackDialog] = useState<TrackDialog>("undecided");
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const preferredAudioTarget = usePreferredAudioTarget();
  const noticeDismissed =
    useAppSelector(selectPreference("conversionNoticeDismissed")) === "true";
  const container = tracks.data?.container;
  const choiceDue =
    container !== undefined &&
    trackDialog === "undecided" &&
    needsTrackChoice(container, selection);
  const environment = useMemo(
    () =>
      tracks.data === undefined
        ? null
        : measurePlaybackEnvironment(
            tracks.data.direct_mime_type,
            containerCodecStrings(tracks.data.container),
            readPlaybackProbes(),
          ),
    [tracks.data],
  );
  const playback = usePlanPlaybackQuery(
    environment === null || choiceDue || preferredAudioTarget === undefined
      ? skipToken
      : {
          projectId,
          mediaFileId,
          request: {
            environment,
            selection,
            preferred_audio_target: preferredAudioTarget,
          },
        },
  );
  const [saveSelection] = useSaveTrackSelectionMutation();

  const playerStatus: PlayerStatus = derivePlayerStatus({
    server: getServerConfig(),
    projectId,
    mediaFileId,
    tracks: tracks.data,
    tracksError: tracks.error,
    playback: playback.data,
    playbackError: playback.error,
    selection,
    noticeSettled: noticeDismissed || noticeAccepted,
  });
  const chooseTracks = (chosen: TrackSelection) => {
    setSelection(chosen);
    setTrackDialog("closed");
    saveSelection({ projectId, mediaFileId, selection: chosen })
      .unwrap()
      .catch(() =>
        dispatch(
          actions.notificationRequested("The track choice could not be saved"),
        ),
      );
  };
  return {
    playback: playerStatus,
    trackChoice:
      container !== undefined && (choiceDue || trackDialog === "open")
        ? {
            videoTracks: tracksOfKind(container, "video").map(trackChoiceOf),
            audioTracks: tracksOfKind(container, "audio").map(trackChoiceOf),
            initialSelection: selection ?? undefined,
          }
        : null,
    canChooseTracks:
      container !== undefined && needsTrackChoice(container, null),
    chooseTracks,
    cancelTrackChoice: () => setTrackDialog("closed"),
    openTrackChoice: useCallback(() => setTrackDialog("open"), []),
    acceptNotice: () => setNoticeAccepted(true),
  };
}

/**
 * The lossless-audio preference as it stood once the stored preferences had loaded, or undefined until then.
 * A later change applies to the next file.
 */
function usePreferredAudioTarget(): AudioTarget | null | undefined {
  const loaded = useAppSelector(selectPreferencesLoaded);
  const lossless = useAppSelector(selectPreference("losslessAudio")) === "true";
  const [target, setTarget] = useState<AudioTarget | null | undefined>();
  if (loaded && target === undefined) setTarget(lossless ? "flac" : null);
  return target;
}
