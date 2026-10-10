import type { WaveformViewName } from "@easyimmerse/state";
import { useAppSelector } from "../../hooks/useAppSelector.ts";
import type { WaveformWindows } from "./selectWaveformWindows.ts";
import {
  haveSameWindows,
  selectWaveformWindows,
} from "./selectWaveformWindows.ts";

/** Returns the peaks windows loaded so far for a waveform view of the open media file, by their start. */
export function useWaveformWindows(name: WaveformViewName): WaveformWindows {
  return useAppSelector(
    (state) => selectWaveformWindows(state, name),
    haveSameWindows,
  );
}
