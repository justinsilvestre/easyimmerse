import type { RootState } from "../../app/createAppStore.ts";
import type { ReadableState } from "../../app/feature.ts";
import { mainScreenOf } from "../../route/route.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import type { MediaScreenState } from "../screenState.ts";

/** Returns the open media file's length: the player's once it has loaded the file, else the probed one, else zero. */
export function mediaDurationMs(
  app: Pick<ReadableState, "route" | "screen" | "backend">,
): number {
  const { main } = app.screen;
  return main.kind === "media" ? mediaScreenDurationMs(main, app) : 0;
}

/** Returns the length of the file a media screen plays, as `mediaDurationMs` describes. */
export function mediaScreenDurationMs(
  screen: MediaScreenState,
  app: Pick<ReadableState, "route" | "backend">,
): number {
  const playerSeconds = screen.playing.player.durationSeconds;
  if (playerSeconds > 0) return playerSeconds * 1000;
  const route = mainScreenOf(app.route);
  if (route.screen !== "media") return 0;
  const { projectId, mediaFileId } = route;
  const tracks = cacheEntry(app.backend, "getMediaTracks", {
    projectId,
    mediaFileId,
  });
  return tracks?.data?.container.duration_ms ?? 0;
}

/** Returns the open media file's length, as `mediaDurationMs` describes. */
export const selectMediaDurationMs = (root: RootState) =>
  mediaDurationMs({ ...root.app, backend: root.backend });
