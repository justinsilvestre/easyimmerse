import type { SubtitleSelection } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { MainRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import type { PlayerState } from "./playerState.ts";
import { roleForNewTrack } from "./roleForNewTrack.ts";
import { updateWaveform } from "./updateWaveform.ts";

type MediaRoute = Extract<MainRoute, { screen: "media" }>;

const subtitlesNotAdded: Effect = {
  type: "showNotification",
  message: "The subtitles file could not be added",
};

/** Updates the media screen: its player, the subtitles file picked for it, and its waveform. */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
): readonly [MediaScreenState, readonly Effect[]] {
  const [waveform, waveformEffects] = updateWaveform(
    screen.waveform,
    action,
    route,
  );
  const [updated, effects] = updatePlayerAndSubtitles(
    waveform === screen.waveform ? screen : { ...screen, waveform },
    action,
    route,
  );
  return [
    updated,
    waveformEffects.length === 0 ? effects : [...waveformEffects, ...effects],
  ];
}

function updatePlayerAndSubtitles(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
): readonly [MediaScreenState, readonly Effect[]] {
  switch (action.type) {
    case "seekRequested":
      return [
        withPlayer(screen, { currentTimeSeconds: action.seconds }),
        [{ type: "seekPlayer", seconds: action.seconds }],
      ];
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

function withPlayer(
  screen: MediaScreenState,
  player: Partial<PlayerState>,
): MediaScreenState {
  return { ...screen, player: { ...screen.player, ...player } };
}
