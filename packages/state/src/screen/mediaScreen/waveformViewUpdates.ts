import type { Effect } from "../../app/effect.ts";
import { isAborted } from "../../server/isAborted.ts";
import type { RequestSettled } from "../../server/serverRequest.ts";
import type { WaveformViewState } from "./waveformState.ts";
import { startsWith, withoutWindow, withStatus } from "./waveformState.ts";
import type { WindowTarget } from "./waveformWindowEffects.ts";
import {
  retryTimer,
  retryTimerId,
  windowRequest,
} from "./waveformWindowEffects.ts";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import {
  planWindowRequests,
  waveformWindowMs,
} from "./waveformWindowPolicy.ts";

/** The action reporting how a window's request ended. */
export type WindowSettled = Extract<
  RequestSettled,
  { request: { kind: "getWaveformWindow" } }
>;

type Updated = readonly [WaveformViewState, readonly Effect[]];

/** Takes the new view and requests the windows it lacks. A null view wants nothing, so nothing more is requested. */
export function viewChanged(
  state: WaveformViewState,
  view: WaveformWindowView | null,
  target: WindowTarget,
): Updated {
  return requestMissing({ ...state, view }, target);
}

/** Records how a window's request ended, starts its retry timer when it failed, and fills the slot it frees. */
export function windowSettled(
  state: WaveformViewState,
  action: WindowSettled,
  target: WindowTarget,
): Updated {
  const start = action.request.startMs;
  if (state.requests[start]?.status !== "loading") return [state, []];
  if (isAborted(action.outcome))
    return requestMissing(withoutWindow(state, start), target);
  if (action.outcome.ok)
    return requestMissing(withStatus(state, start, "loaded"), target);
  const [next, effects] = requestMissing(
    withStatus(state, start, "failed"),
    target,
  );
  return [next, [retryTimer(target, start), ...effects]];
}

/** Lets a failed window be requested again, and requests what the view lacks. */
export function retryDue(
  state: WaveformViewState,
  start: number,
  target: WindowTarget,
): Updated {
  return state.requests[start]?.status === "failed"
    ? requestMissing(withoutWindow(state, start), target)
    : [state, []];
}

/** Cancels the retry timers of the view's failed windows. */
export function cancelRetries(
  state: WaveformViewState,
  target: WindowTarget,
): Effect[] {
  return [...startsWith(state, "failed")].map((start) => ({
    type: "cancelTimer",
    id: retryTimerId(target, start),
  }));
}

/** Requests the windows that the policy picks for the view, and records each as loading. */
function requestMissing(
  state: WaveformViewState,
  target: WindowTarget,
): Updated {
  const { view } = state;
  if (view === null) return [state, []];
  const starts = planWindowRequests(
    view,
    startsWith(state, "loaded"),
    startsWith(state, "loading"),
    startsWith(state, "failed"),
  );
  if (starts.length === 0) return [state, []];
  const requests = { ...state.requests };
  const effects: Effect[] = [];
  for (const start of starts) {
    const endMs = Math.min(start + waveformWindowMs, view.durationMs);
    requests[start] = { endMs, status: "loading" };
    effects.push(windowRequest(target, start, endMs));
  }
  return [{ ...state, requests }, effects];
}
