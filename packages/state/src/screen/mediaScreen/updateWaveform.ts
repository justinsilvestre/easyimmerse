import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { ReadableState } from "../../app/feature.ts";
import type { Update } from "../../app/update.ts";
import { updated } from "../../app/updated.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { MediaScreenState } from "../screenState.ts";
import { mediaScreenDurationMs } from "./mediaDurationMs.ts";
import { selectShownMediaFile } from "./mediaScreenSelectors.ts";
import type {
  WaveformState,
  WaveformViewName,
  WaveformViewState,
} from "./waveformState.ts";
import { waveformViews } from "./waveformViews.ts";
import type { ViewTarget, WindowSettled } from "./waveformViewUpdates.ts";
import {
  cancelRetries,
  requestMissing,
  retryDue,
  windowSettled,
} from "./waveformViewUpdates.ts";
import { windowRequestId } from "./waveformWindowEffects.ts";

const viewNames: readonly WaveformViewName[] = ["player", "clip"];

/**
 * Keeps the span the player strip is zoomed to, works out the stretch of the file each waveform view loads,
 * and requests the windows each view lacks, at most three at a time and most urgent first.
 * It requests a failed window again once its retry delay has passed.
 * `screen` is the media screen after its other fields have taken the action, so that the views follow the new time, panels and card.
 */
export function updateWaveform(
  screen: MediaScreenState,
  action: AppAction,
  app: Pick<ReadableState, "route" | "backend">,
): Update<WaveformState, Effect> {
  const route = selectShownMediaFile(app);
  const waveform =
    action.type === "waveformZoomed"
      ? { ...screen.waveform, requestedSpanMs: action.spanMs }
      : screen.waveform;
  const durationMs = mediaScreenDurationMs(screen, app);
  const views = waveformViews({ ...screen, waveform }, durationMs);
  let next = waveform;
  const effects: Effect[] = [];
  for (const name of viewNames) {
    const target = { route, name, view: views[name] };
    const [view, viewEffects] = updateView(waveform[name], action, target);
    if (view !== waveform[name]) next = { ...next, [name]: view };
    effects.push(...viewEffects);
  }
  return updated(next, ...effects);
}

/** Cancels the retry timers of both views, for a media screen being replaced. Requests in flight are left to finish into the cache. */
export function leaveWaveform(waveform: WaveformState, route: MediaRoute) {
  return viewNames.flatMap((name) =>
    cancelRetries(waveform[name], { route, name }),
  );
}

function updateView(
  state: WaveformViewState,
  action: AppAction,
  target: ViewTarget,
): Update<WaveformViewState, Effect> {
  if (action.type === "waveformRetryDue" && action.name === target.name)
    return retryDue(state, action.startMs, target);
  if (isWindowSettled(action, target))
    return windowSettled(state, action, target);
  return requestMissing(state, target);
}

function isWindowSettled(
  action: AppAction,
  target: ViewTarget,
): action is WindowSettled {
  return (
    action.type === "requestSettled" &&
    action.request.kind === "getWaveformWindow" &&
    isSettled(
      action,
      windowRequestId(target, action.request.startMs),
      "getWaveformWindow",
    )
  );
}
