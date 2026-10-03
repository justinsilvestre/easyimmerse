import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import type { FetchWaveformWindow } from "./waveformWindowStore.ts";
import { createWaveformWindowStore } from "./waveformWindowStore.ts";

/**
 * Keeps the peaks windows the view needs loaded, requesting them through `fetchWindow`
 * in the order the window policy sets, and returns the windows held so far by their start.
 */
export function useWaveformWindows(
  fetchWindow: FetchWaveformWindow,
  view: WaveformWindowView,
): ReadonlyMap<number, Uint8Array> {
  const store = useMemo(
    () => createWaveformWindowStore(fetchWindow),
    [fetchWindow],
  );
  useEffect(() => () => store.dispose(), [store]);
  const { viewStartMs, viewEndMs, focusMs, durationMs } = view;
  useEffect(() => {
    store.update({ viewStartMs, viewEndMs, focusMs, durationMs });
  }, [store, viewStartMs, viewEndMs, focusMs, durationMs]);
  return useSyncExternalStore(store.subscribe, store.getWindows);
}
