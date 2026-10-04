import { useEffect, useState, useSyncExternalStore } from "react";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import type {
  FetchWaveformWindow,
  WaveformWindowStore,
} from "./waveformWindowStore.ts";
import { createWaveformWindowStore } from "./waveformWindowStore.ts";

const noWindows: ReadonlyMap<number, Uint8Array> = new Map();
const subscribeToNothing = () => () => undefined;

/**
 * Keeps the peaks windows the view needs loaded, requesting them through `fetchWindow`
 * in the order the window policy sets, and returns the windows held so far by their start.
 */
export function useWaveformWindows(
  fetchWindow: FetchWaveformWindow,
  view: WaveformWindowView,
): ReadonlyMap<number, Uint8Array> {
  const [store, setStore] = useState<WaveformWindowStore | null>(null);
  useEffect(() => {
    const created = createWaveformWindowStore(fetchWindow);
    setStore(created);
    return () => created.dispose();
  }, [fetchWindow]);
  const { viewStartMs, viewEndMs, focusMs, durationMs } = view;
  useEffect(() => {
    store?.update({ viewStartMs, viewEndMs, focusMs, durationMs });
  }, [store, viewStartMs, viewEndMs, focusMs, durationMs]);
  return useSyncExternalStore(
    store?.subscribe ?? subscribeToNothing,
    store?.getWindows ?? (() => noWindows),
  );
}
