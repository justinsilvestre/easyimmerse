import type { AppState } from "../../app/appState.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { MediaScreenState } from "../screenState.ts";
import {
  selectMediaScreen,
  selectShownMediaFile,
  selectShownMediaScreen,
} from "./mediaScreenSelectors.ts";

/**
 * Returns the media file a media screen's player plays, with its project.
 * On the media screen it is the route's file. The reader's route names the book, which has nothing to play,
 * but a book aligned with an audio file plays that file's sentences as they are read; once the reader has found
 * the audio file, its player plays that file instead. The player, the playback method, and the stored playback
 * position then all belong to the audio file, and the media screen's playback rules work on it unchanged.
 */
export function playedMediaFileOf(
  screen: MediaScreenState,
  route: MediaRoute,
): MediaRoute {
  return {
    ...route,
    mediaFileId: screen.reader.audioMediaFileId ?? route.mediaFileId,
  };
}

/** Returns the media file the shown media screen's player plays, as `playedMediaFileOf` describes. It throws on any other screen. */
export function selectPlayedMediaFile(
  app: Pick<AppState, "route" | "screen">,
): MediaRoute {
  return playedMediaFileOf(
    selectShownMediaScreen(app),
    selectShownMediaFile(app),
  );
}

/** Returns the media file the open media screen's player plays, as `playedMediaFileOf` describes, or null on any other screen. */
export function selectOpenPlayedMediaFile(
  app: Pick<AppState, "route" | "screen">,
): MediaRoute | null {
  const open = selectMediaScreen(app);
  return open && playedMediaFileOf(open.screen, open.route);
}
