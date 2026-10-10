import type { RootState } from "../../app/createAppStore.ts";
import type { ReadableState } from "../../app/feature.ts";
import { mainScreenOf } from "../../route/route.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";

/** Returns the open media file's length: the player's once it has loaded the file, else the probed one, else zero. */
export function mediaDurationMs(
  app: Pick<ReadableState, "route" | "screen" | "backend">,
): number {
  const { main } = app.screen;
  const playerSeconds =
    main.kind === "media" ? main.playing.player.durationSeconds : 0;
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
