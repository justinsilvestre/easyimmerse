import type { AppAction } from "./actions.ts";
import type { AppState, PreferenceKey } from "./appState.ts";
import { initialPlayerState, preferenceKeys } from "./appState.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import type { Effect } from "./effect.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { crossesSaveInterval } from "./playbackPosition.ts";
import { isSameParagraph, type ReaderLocation } from "./readingLocation.ts";

/** Computes the next state and the effects to perform in response to an action. */
export type Update<S, A, E> = (
  state: S,
  action: A,
) => readonly [S, readonly E[]];

const subtitleFileExtensions: readonly string[] = [".srt", ".vtt"];

export const update: Update<AppState, AppAction, Effect> = (state, action) => {
  switch (action.type) {
    case "seekRequested":
      return [
        {
          ...state,
          player: { ...state.player, currentTimeSeconds: action.seconds },
        },
        [{ type: "seekPlayer", seconds: action.seconds }],
      ];
    case "playerTimeChanged": {
      const moved = {
        ...state,
        player: { ...state.player, currentTimeSeconds: action.seconds },
      };
      return crossesSaveInterval(
        state.player.currentTimeSeconds,
        action.seconds,
      )
        ? savePlaybackPosition(moved)
        : [moved, []];
    }
    case "playerBufferedChanged":
      return [
        { ...state, player: { ...state.player, buffered: action.buffered } },
        [],
      ];
    case "playerDurationChanged":
      return [
        {
          ...state,
          player: { ...state.player, durationSeconds: action.seconds },
        },
        [],
      ];
    case "playToggleRequested":
      return [state, [{ type: "togglePlayer" }]];
    case "playRequested":
      return [state, [{ type: "playPlayer" }]];
    case "pauseRequested":
      return [state, [{ type: "pausePlayer" }]];
    case "playerPlayingChanged": {
      const changed = {
        ...state,
        player: { ...state.player, isPlaying: action.isPlaying },
      };
      return action.isPlaying ? [changed, []] : savePlaybackPosition(changed);
    }
    case "volumeChangeRequested":
      return [
        { ...state, player: { ...state.player, volume: action.volume } },
        [{ type: "setPlayerVolume", volume: action.volume }],
      ];
    case "speedChangeRequested":
      return [
        { ...state, player: { ...state.player, speed: action.speed } },
        [{ type: "setPlayerSpeed", speed: action.speed }],
      ];
    case "filePickRequested":
      return [
        { ...state, pendingFilePick: true },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "fileChosen":
      return [
        { ...state, pendingFilePick: false, chosenSubtitleFile: action.file },
        [],
      ];
    case "filePickCancelled":
      return [{ ...state, pendingFilePick: false }, []];
    case "subtitleFileAdded":
      return [{ ...state, chosenSubtitleFile: null }, []];
    case "subtitleFileAddFailed":
      return [
        { ...state, chosenSubtitleFile: null },
        [
          {
            type: "showNotification",
            message: "The subtitles file could not be added",
          },
        ],
      ];
    case "mediaFilePickRequested":
      return [state, [{ type: "pickMediaFile", accept: mediaFileExtensions }]];
    case "mediaFileChosen":
      return [{ ...state, chosenMediaFile: action.file }, []];
    case "mediaFilePickCancelled":
      return [state, []];
    case "mediaFileAdded":
      return [
        {
          ...state,
          chosenMediaFile: null,
          currentMediaFileId: action.mediaFileId,
        },
        [],
      ];
    case "mediaFileAddFailed":
      return [
        { ...state, chosenMediaFile: null },
        [
          {
            type: "showNotification",
            message: "The media file could not be added",
          },
        ],
      ];
    case "mediaFileRemoved":
      return [
        {
          ...state,
          currentMediaFileId:
            state.currentMediaFileId === action.mediaFileId
              ? null
              : state.currentMediaFileId,
        },
        [],
      ];
    case "dictionaryFilePickRequested":
      return [
        state,
        [{ type: "pickDictionaryFile", accept: dictionaryFileExtensions }],
      ];
    case "dictionaryFileChosen":
      return [{ ...state, chosenDictionaryFile: action.file }, []];
    case "dictionaryFilePickCancelled":
      return [state, []];
    case "dictionaryFileHandled":
      return [{ ...state, chosenDictionaryFile: null }, []];
    case "openMedia":
      return [{ ...state, currentMediaFileId: action.mediaFileId }, []];
    case "closeMedia": {
      const [remembered, effects] = savePlaybackPosition(state);
      return [
        {
          ...remembered,
          currentMediaFileId: null,
          chosenSubtitleFile: null,
          player: {
            ...initialPlayerState,
            volume: state.player.volume,
            speed: state.player.speed,
          },
        },
        [...saveOpenBookLocation(state), ...effects],
      ];
    }
    case "playbackPositionLoadRequested":
      return [
        state,
        state.playbackPositions[action.mediaFileId] === undefined
          ? [{ type: "loadPlaybackPosition", mediaFileId: action.mediaFileId }]
          : [],
      ];
    case "playbackPositionLoaded":
      return [
        {
          ...state,
          playbackPositions: {
            ...state.playbackPositions,
            [action.mediaFileId]: action.ms,
          },
        },
        [],
      ];
    case "readingLocationLoadRequested":
      return [
        state,
        state.readingLocations[action.mediaFileId] === undefined
          ? [{ type: "loadReadingLocation", mediaFileId: action.mediaFileId }]
          : [],
      ];
    case "readingLocationLoaded":
      return [
        state.readingLocations[action.mediaFileId] === undefined
          ? setReadingLocation(state, action.mediaFileId, action.location)
          : state,
        [],
      ];
    case "readingLocationReported":
      return [
        setReadingLocation(state, action.mediaFileId, action.location),
        isSameParagraph(
          action.location,
          state.readingLocations[action.mediaFileId],
        )
          ? []
          : [
              {
                type: "saveReadingLocation",
                mediaFileId: action.mediaFileId,
                location: action.location,
              },
            ],
      ];
    case "preferenceToggled":
      return togglePreference(state, action.key);
    case "preferenceSet":
      return [
        setPreference(state, action.key, action.value),
        [{ type: "savePreference", key: action.key, value: action.value }],
      ];
    case "preferencesLoadRequested":
      return [state, [{ type: "loadPreferences", keys: preferenceKeys }]];
    case "preferencesLoaded":
      return [
        {
          ...state,
          preferences: { ...state.preferences, ...action.preferences },
          preferencesLoaded: true,
        },
        [],
      ];
    case "notificationRequested":
      return [state, [{ type: "showNotification", message: action.message }]];
    case "unsavedWorkBegan":
      return [
        { ...state, unsavedWorkCount: state.unsavedWorkCount + 1 },
        state.unsavedWorkCount === 0
          ? [{ type: "guardClose", isActive: true }]
          : [],
      ];
    case "unsavedWorkEnded": {
      const unsavedWorkCount = Math.max(state.unsavedWorkCount - 1, 0);
      return [
        { ...state, unsavedWorkCount },
        state.unsavedWorkCount > 0 && unsavedWorkCount === 0
          ? [{ type: "guardClose", isActive: false }]
          : [],
      ];
    }
    case "externalLinkRequested":
      return [state, [{ type: "openExternalUrl", url: action.url }]];
    case "systemThemeChanged":
      return [{ ...state, systemTheme: action.theme }, []];
    case "textScaleChosen":
      return [
        setPreference(state, "textScale", String(action.scale)),
        [
          {
            type: "savePreference",
            key: "textScale",
            value: String(action.scale),
          },
        ],
      ];
  }
};

function togglePreference(
  state: AppState,
  key: PreferenceKey,
): readonly [AppState, Effect[]] {
  const value = state.preferences[key] === "true" ? "false" : "true";
  return [
    setPreference(state, key, value),
    [{ type: "savePreference", key, value }],
  ];
}

function setPreference(
  state: AppState,
  key: PreferenceKey,
  value: string,
): AppState {
  return { ...state, preferences: { ...state.preferences, [key]: value } };
}

function setReadingLocation(
  state: AppState,
  mediaFileId: string,
  location: ReaderLocation | null,
): AppState {
  return {
    ...state,
    readingLocations: { ...state.readingLocations, [mediaFileId]: location },
  };
}

/**
 * Remembers where playback is in the open media file and saves it, once the player has loaded the file.
 * A book never loads the player, so its position is not saved.
 */
function savePlaybackPosition(state: AppState): [AppState, Effect[]] {
  const mediaFileId = state.currentMediaFileId;
  if (mediaFileId === null || state.player.durationSeconds === 0)
    return [state, []];
  const ms = state.player.currentTimeSeconds * 1000;
  return [
    {
      ...state,
      playbackPositions: { ...state.playbackPositions, [mediaFileId]: ms },
    },
    [{ type: "savePlaybackPosition", mediaFileId, ms }],
  ];
}

/**
 * Saves the reading place in the open book, if it is a book.
 * Within a paragraph the place is saved only here, so that scrolling does not write on every frame.
 */
function saveOpenBookLocation(state: AppState): Effect[] {
  const mediaFileId = state.currentMediaFileId;
  const location = mediaFileId && state.readingLocations[mediaFileId];
  return mediaFileId && location
    ? [{ type: "saveReadingLocation", mediaFileId, location }]
    : [];
}
