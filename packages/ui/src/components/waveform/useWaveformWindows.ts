import type { WaveformViewName, WaveformWindowView } from "@easyimmerse/state";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import { useEffect } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { useAppSelector } from "../../hooks/useAppSelector.ts";
import type { WaveformWindows } from "./selectWaveformWindows.ts";
import {
  haveSameWindows,
  selectWaveformWindows,
} from "./selectWaveformWindows.ts";

/**
 * Tells the store which stretch of the open media file a waveform view shows, and that it shows nothing once unmounted,
 * and returns the peaks windows loaded for that view so far by their start.
 */
export function useWaveformWindows(
  name: WaveformViewName,
  view: WaveformWindowView,
): WaveformWindows {
  const dispatch = useAppDispatch();
  const mediaFileId = useAppSelector(selectCurrentMediaFileId);
  const { viewStartMs, viewEndMs, focusMs, durationMs } = view;
  // Transitional: the update will compute the view itself once the probed duration and the open clip are in the store.
  useEffect(() => {
    if (mediaFileId === null) return;
    const changed = { viewStartMs, viewEndMs, focusMs, durationMs };
    dispatch(actions.waveformViewChanged(name, changed));
  }, [
    dispatch,
    name,
    mediaFileId,
    viewStartMs,
    viewEndMs,
    focusMs,
    durationMs,
  ]);
  useEffect(
    () => () => {
      dispatch(actions.waveformViewChanged(name, null));
    },
    [dispatch, name],
  );
  return useAppSelector(
    (state) => selectWaveformWindows(state, name),
    haveSameWindows,
  );
}
