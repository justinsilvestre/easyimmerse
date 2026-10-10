import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isSettled } from "../../server/isSettled.ts";
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
 * Requests the windows each waveform view wants, at most three at a time and most urgent first,
 * and requests a failed window again once its retry delay has passed.
 */
export function updateWaveform(
  waveform: WaveformState,
  action: AppAction,
  route: WindowTarget["route"],
): readonly [WaveformState, readonly Effect[]] {
  switch (action.type) {
    case "waveformZoomed":
      return [{ ...waveform, requestedSpanMs: action.spanMs }, []];
    case "waveformViewChanged": {
      const { name } = action;
      const updated = viewChanged(waveform[name], action.view, { route, name });
      return withView(waveform, name, updated);
    }
    case "waveformRetryDue": {
      const { name } = action;
      const updated = retryDue(waveform[name], action.startMs, { route, name });
      return withView(waveform, name, updated);
    }
    case "requestSettled": {
      for (const name of viewNames) {
        const target = { route, name };
        if (isWindowSettled(action, target))
          return withView(
            waveform,
            name,
            windowSettled(waveform[name], action, target),
          );
      }
      return [waveform, []];
    }
    default:
      return [waveform, []];
  }
}

/** Cancels the retry timers of both views, for a media screen being replaced. Requests in flight are left to finish into the cache. */
export function leaveWaveform(
  waveform: WaveformState,
  route: WindowTarget["route"],
): Effect[] {
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
  [view, effects]: readonly [WaveformViewState, readonly Effect[]],
): readonly [WaveformState, readonly Effect[]] {
  return [
    view === waveform[name] ? waveform : { ...waveform, [name]: view },
    effects,
  ];
}
