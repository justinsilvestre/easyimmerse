import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
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

/** The stretch of the file a view loads, or null when it loads nothing, with the media file and view the requests are for. */
export type ViewTarget = WindowTarget & { view: WaveformWindowView | null };

/** Records how a window's request ended, starts its retry timer when it failed, and fills the slot it frees. */
export function windowSettled(
  state: WaveformViewState,
  action: WindowSettled,
  target: ViewTarget,
) {
  const start = action.request.startMs;
  if (state.requests[start]?.status !== "loading")
    return requestMissing(state, target);
  if (isAborted(action.outcome))
    return requestMissing(withoutWindow(state, start), target);
  if (action.outcome.ok)
    return requestMissing(withStatus(state, start, "loaded"), target);
  const [next, effects] = requestMissing(
    withStatus(state, start, "failed"),
    target,
  );
  return updated(next, retryTimer(target, start), ...effects);
}

/** Lets a failed window be requested again, and requests what the view lacks. */
export function retryDue(
  state: WaveformViewState,
  start: number,
  target: ViewTarget,
) {
  return requestMissing(
    state.requests[start]?.status === "failed"
      ? withoutWindow(state, start)
      : state,
    target,
  );
}

/** Cancels the retry timers of the view's failed windows. */
export function cancelRetries(state: WaveformViewState, target: WindowTarget) {
  return [...startsWith(state, "failed")].map(
    (start) =>
      ({
        type: "cancelTimer",
        id: retryTimerId(target, start),
      }) satisfies Effect,
  );
}

/** Requests the windows that the policy picks for the view, and records each as loading. A view that loads nothing requests nothing. */
export function requestMissing(state: WaveformViewState, target: ViewTarget) {
  const { view } = target;
  if (view === null) return updated(state);
  const starts = planWindowRequests(
    view,
    startsWith(state, "loaded"),
    startsWith(state, "loading"),
    startsWith(state, "failed"),
  );
  if (starts.length === 0) return updated(state);
  const requests = { ...state.requests };
  const effects: Effect[] = [];
  for (const start of starts) {
    const endMs = Math.min(start + waveformWindowMs, view.durationMs);
    requests[start] = { endMs, status: "loading" };
    effects.push(windowRequest(target, start, endMs));
  }
  return updated({ ...state, requests }, ...effects);
}
