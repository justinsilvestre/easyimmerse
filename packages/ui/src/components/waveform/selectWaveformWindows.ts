import { selectCachedWaveformWindow } from "@easyimmerse/backend";
import type { RootState, WaveformViewName } from "@easyimmerse/state";
import {
  mainScreenOf,
  selectRoute,
  selectWaveformRequests,
} from "@easyimmerse/state";

/** The peaks windows of a view that have loaded, by their start. */
export type WaveformWindows = ReadonlyMap<number, readonly number[]>;

/**
 * Selects the peaks of the windows a view has loaded, read from the cache under the start and end each was requested with.
 * Windows the server found no peaks for are left out. Compare results with `haveSameWindows`, since each call builds a new map.
 */
export function selectWaveformWindows(
  state: RootState,
  name: WaveformViewName,
): WaveformWindows {
  const route = mainScreenOf(selectRoute(state));
  const windows = new Map<number, readonly number[]>();
  if (route.screen !== "media") return windows;
  const { projectId, mediaFileId } = route;
  for (const [start, request] of Object.entries(
    selectWaveformRequests(state, name),
  )) {
    if (request?.status !== "loaded") continue;
    const startMs = Number(start);
    const window = { projectId, mediaFileId, startMs, endMs: request.endMs };
    const peaks = selectCachedWaveformWindow(state, window)?.peaks;
    if (peaks !== undefined && peaks.length > 0) windows.set(startMs, peaks);
  }
  return windows;
}

/** Tells whether two selections hold the same peaks arrays under the same starts. */
export function haveSameWindows(
  before: WaveformWindows,
  after: WaveformWindows,
): boolean {
  if (before.size !== after.size) return false;
  for (const [start, peaks] of after)
    if (before.get(start) !== peaks) return false;
  return true;
}
