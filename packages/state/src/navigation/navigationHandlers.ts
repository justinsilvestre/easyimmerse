import type { MediaFile } from "@easyimmerse/types";
import type { AppState } from "../appState.ts";
import { closedFlashcardEditor } from "../flashcardEditor/flashcardEditorState.ts";
import { closedLookup } from "../lookup/lookupState.ts";
import { initialPlayerState } from "../player/playerState.ts";
import { stopLoopIfSet } from "../player/withPlayer.ts";
import { readStoredSubtitleTexts } from "../subtitles/readStoredSubtitleTexts.ts";
import type { UpdateHandlers, UpdateResult } from "../updateHandlers.ts";
import type { Screen } from "./screen.ts";

export const navigationHandlers = {
  homeOpened: (state) => [withScreen(state, { kind: "home" }), []],
  newProjectFormOpened: (state) => [
    withScreen(state, { kind: "newProject" }),
    [],
  ],
  projectOpened: (state, { projectId }) => [
    withScreen(state, { kind: "project", projectId }),
    [],
  ],
  mediaOpened: (state, { projectId, media }) => [
    openMedia(state, projectId, media),
    [
      ...stopLoopIfSet(state.player),
      { type: "resolveMediaUrl", projectId, media },
      ...readStoredSubtitleTexts(media),
    ],
  ],
  mediaClosed: closeMedia,
} satisfies Partial<UpdateHandlers>;

function withScreen(state: AppState, screen: Screen): AppState {
  return { ...state, screen };
}

function openMedia(
  state: AppState,
  projectId: string,
  media: MediaFile,
): AppState {
  return {
    ...withoutMedia(state),
    screen: { kind: "media", projectId, mediaId: media.id },
    player: { ...initialPlayerState, durationMs: media.duration_ms },
    subtitles: { ...state.subtitles, browserFileTexts: {} },
  };
}

/** Returns to the project screen and stops the player. */
function closeMedia(state: AppState): UpdateResult {
  if (state.screen.kind !== "media") return [state, []];
  const screen: Screen = { kind: "project", projectId: state.screen.projectId };
  return [
    { ...withoutMedia(state), screen },
    [...stopLoopIfSet(state.player), { type: "pausePlayer" }],
  ];
}

/** Resets everything tied to the open media. */
function withoutMedia(state: AppState): AppState {
  return {
    ...state,
    player: initialPlayerState,
    lookup: closedLookup,
    flashcardEditor: closedFlashcardEditor,
  };
}
