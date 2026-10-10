import { actions } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MainRoute } from "../../route/route.ts";
import type { WaveformViewName } from "./waveformState.ts";
import { waveformWindowRetryMs } from "./waveformWindowPolicy.ts";

/** The open media file and the view whose windows are requested. */
export type WindowTarget = {
  route: Extract<MainRoute, { screen: "media" }>;
  name: WaveformViewName;
};

/** The id of a window's request. */
export function windowRequestId(target: WindowTarget, start: number): string {
  return `media/${target.route.mediaFileId}/waveform/${target.name}/${start}`;
}

/** Requests one window for a view. */
export function windowRequest(
  target: WindowTarget,
  startMs: number,
  endMs: number,
): Effect {
  const { projectId, mediaFileId } = target.route;
  return {
    type: "sendRequest",
    id: windowRequestId(target, startMs),
    request: {
      kind: "getWaveformWindow",
      projectId,
      mediaFileId,
      startMs,
      endMs,
    },
  };
}

/** Starts the timer after which a failed window may be requested again. */
export function retryTimer(target: WindowTarget, start: number): Effect {
  return {
    type: "startTimer",
    id: retryTimerId(target, start),
    ms: waveformWindowRetryMs,
    action: actions.waveformRetryDue(target.name, start),
  };
}

/** The id of the timer after which a failed window may be requested again. */
export function retryTimerId(target: WindowTarget, start: number): string {
  return `${windowRequestId(target, start)}/retry`;
}
