import type { SubtitleSelection } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import { roleForNewTrack } from "./roleForNewTrack.ts";
import { seekTo, withPlayer } from "./seekTo.ts";
import { updateClipLoop } from "./updateClipLoop.ts";
import { updateResume } from "./updateResume.ts";
import { updateWaveform } from "./updateWaveform.ts";

const subtitlesNotAdded: Effect = {
  type: "showNotification",
  message: "The subtitles file could not be added",
};

type MediaScreenUpdate = (
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
) => readonly [MediaScreenState, readonly Effect[]];

/** The parts of the media screen's update, in the order each sees an action. The loop comes after the player has recorded a time. */
const mediaScreenUpdates: readonly MediaScreenUpdate[] = [
  (screen, action, route) => {
    const [waveform, effects] = updateWaveform(screen.waveform, action, route);
    return [
      waveform === screen.waveform ? screen : { ...screen, waveform },
      effects,
    ];
  },
  updatePlayerAndSubtitles,
  updateClipLoop,
  updateResume,
];

/**
 * Updates the media screen: its player, the clip loop, the resume seek, the subtitles file picked for it, and its waveform.
 * `app` is the state before the action.
 */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): readonly [MediaScreenState, readonly Effect[]] {
  let next = screen;
  const effects: Effect[] = [];
  for (const update of mediaScreenUpdates) {
    const [updated, partEffects] = update(next, action, route, app);
    next = updated;
    effects.push(...partEffects);
  }
  return [next, effects];
}

function updatePlayerAndSubtitles(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
): readonly [MediaScreenState, readonly Effect[]] {
  switch (action.type) {
    case "seekRequested":
      return seekTo(screen, action.seconds * 1000);
    case "playerTimeChanged":
      return [withPlayer(screen, { currentTimeSeconds: action.seconds }), []];
    case "playerDurationChanged":
      return [withPlayer(screen, { durationSeconds: action.seconds }), []];
    case "playerBufferedChanged":
      return [withPlayer(screen, { buffered: action.buffered }), []];
    case "playerPlayingChanged":
      return [withPlayer(screen, { isPlaying: action.isPlaying }), []];
    case "playToggleRequested":
      return [screen, [{ type: "togglePlayer" }]];
    case "playRequested":
      return [screen, [{ type: "playPlayer" }]];
    case "pauseRequested":
      return [screen, [{ type: "pausePlayer" }]];
    case "subtitleFileChosen":
      // The new track's role depends on the current selection, which the listing returns.
      return [
        { ...screen, pendingSubtitleFile: action.file },
        [
          {
            type: "sendRequest",
            id: tracksRequestId(route),
            request: {
              kind: "listSubtitleTracks",
              projectId: route.projectId,
              mediaFileId: route.mediaFileId,
            },
          },
        ],
      ];
    case "requestSettled": {
      const pending = screen.pendingSubtitleFile;
      if (
        pending === null ||
        !isSettled(action, tracksRequestId(route), "listSubtitleTracks")
      )
        return [screen, []];
      return [
        { ...screen, pendingSubtitleFile: null },
        [
          action.outcome.ok
            ? sendSubtitleFile(route, pending, action.outcome.data.selection)
            : subtitlesNotAdded,
        ],
      ];
    }
    default:
      return [screen, []];
  }
}

function tracksRequestId(route: MediaRoute): string {
  return `media/${route.mediaFileId}/listSubtitleTracks`;
}

/** Sends a picked subtitles file to the open media file, in the role the current selection leaves for it. */
function sendSubtitleFile(
  route: MediaRoute,
  file: PickedFile,
  selection: SubtitleSelection,
): Effect {
  return {
    type: "sendRequest",
    id: `media/${route.mediaFileId}/addSubtitleTrack`,
    request: {
      kind: "addSubtitleTrack",
      projectId: route.projectId,
      mediaFileId: route.mediaFileId,
      request: {
        name: file.name,
        source: file.source,
        format: null,
        role: roleForNewTrack(selection),
      },
    },
  };
}
