import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { Update } from "../../app/update.ts";
import { updated } from "../../app/updated.ts";
import type { MediaRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { shownMediaFile } from "./shownMediaScreen.ts";
import type {
  WaveformState,
  WaveformViewName,
  WaveformViewState,
} from "./waveformState.ts";
import type { WindowSettled } from "./waveformViewUpdates.ts";
import {
  cancelRetries,
  retryDue,
  viewChanged,
  windowSettled,
} from "./waveformViewUpdates.ts";
import type { WindowTarget } from "./waveformWindowEffects.ts";
import { windowRequestId } from "./waveformWindowEffects.ts";

const viewNames: readonly WaveformViewName[] = ["player", "clip"];

/**
 * Keeps the span the player strip is zoomed to, requests the windows each waveform view wants,
 * at most three at a time and most urgent first, and requests a failed window again once its retry delay has passed.
 */
export function updateWaveform(
  waveform: WaveformState,
  action: AppAction,
  app: AppState,
) {
  const route = shownMediaFile(app);
  switch (action.type) {
    case "waveformZoomed":
      return updated({ ...waveform, requestedSpanMs: action.spanMs });
    case "waveformViewChanged": {
      const { name } = action;
      const viewUpdate = viewChanged(waveform[name], action.view, {
        route,
        name,
      });
      return withView(waveform, name, viewUpdate);
    }
    case "waveformRetryDue": {
      const { name } = action;
      const viewUpdate = retryDue(waveform[name], action.startMs, {
        route,
        name,
      });
      return withView(waveform, name, viewUpdate);
    }
    case "requestSettled": {
      for (const name of viewNames) {
        const target = { route: route, name };
        if (isWindowSettled(action, target))
          return withView(
            waveform,
            name,
            windowSettled(waveform[name], action, target),
          );
      }
      return updated(waveform);
    }
    default:
      return updated(waveform);
  }
}

/** Cancels the retry timers of both views, for a media screen being replaced. Requests in flight are left to finish into the cache. */
export function leaveWaveform(waveform: WaveformState, route: MediaRoute) {
  return viewNames.flatMap((name) =>
    cancelRetries(waveform[name], { route, name }),
  );
}

function isWindowSettled(
  action: AppAction,
  target: WindowTarget,
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

function withView(
  waveform: WaveformState,
  name: WaveformViewName,
  [view, effects]: Update<WaveformViewState, Effect>,
) {
  return updated(
    view === waveform[name] ? waveform : { ...waveform, [name]: view },
    ...effects,
  );
}
