import type { RootState } from "../../app/createAppStore.ts";
import type { WaveformViewName, WaveformViewState } from "./waveformState.ts";
import { initialWaveform } from "./waveformState.ts";

const waveformOf = (state: RootState) =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.waveform
    : initialWaveform;

/** Returns the window requests of one waveform view of the open media file, or none while no media screen is open. */
export const selectWaveformRequests = (
  state: RootState,
  name: WaveformViewName,
): WaveformViewState["requests"] => waveformOf(state)[name].requests;

/** Returns the span the user last zoomed the player's waveform strip to. */
export const selectRequestedWaveformSpan = (state: RootState) =>
  waveformOf(state).requestedSpanMs;
