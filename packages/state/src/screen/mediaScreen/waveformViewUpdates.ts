import type { Effect } from "../../app/effect.ts";
import { isAborted } from "../../server/isAborted.ts";
import type { RequestSettled } from "../../server/serverRequest.ts";
import type { WaveformViewState, WindowRequest } from "./waveformState.ts";
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

/** The end of a window's request. */
export type WindowSettled = Extract<
  RequestSettled,
  { request: { kind: "getWaveformWindow" } }
>;

type Updated = readonly [WaveformViewState, readonly Effect[]];

/** Takes the new view and requests the windows it lacks. */
export function viewChanged(
  state: WaveformViewState,
  view: WaveformWindowView,
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

function startsWith(
  state: WaveformViewState,
  status: WindowRequest["status"],
): Set<number> {
  const starts = new Set<number>();
  for (const [start, request] of Object.entries(state.requests))
    if (request?.status === status) starts.add(Number(start));
  return starts;
}

function withStatus(
  state: WaveformViewState,
  start: number,
  status: WindowRequest["status"],
): WaveformViewState {
  const request = state.requests[start] as WindowRequest;
  return {
    ...state,
    requests: { ...state.requests, [start]: { ...request, status } },
  };
}

function withoutWindow(
  state: WaveformViewState,
  start: number,
): WaveformViewState {
  const { [start]: _removed, ...requests } = state.requests;
  return { ...state, requests };
}
