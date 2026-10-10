import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { mainScreenOf } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ScreenState } from "../screenState.ts";
import { isConversionNoticeDue, isNoticeSettled } from "./conversionNotice.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { needsTrackChoice } from "./playbackPlanRules.ts";
import { playbackRequestIds } from "./playbackRequests.ts";

type DialogState = ScreenState["dialog"];

/**
 * Opens the track choice before the first play when a kind has several tracks and no choice is saved, or when the user asks,
 * and the conversion notice when the plan re-encodes a track and the user has not settled the notice;
 * a notice that comes due while the track choice is open waits until the choice is cancelled.
 * Keeps what each dialog shows until it closes. `app` is the state before the action.
 */
export function updatePlaybackDialog(
  dialog: DialogState,
  action: AppAction,
  app: AppState,
): DialogState {
  const open = openPathPlayback(app);
  if (open === null) return dialog;
  switch (action.type) {
    case "requestSettled":
      return settledDialog(dialog, action, open, app);
    case "trackChoiceRequested":
      return {
        kind: "trackChoice",
        selection: open.playback.selection,
        stage: "confirming",
      };
    case "trackChoiceChanged":
      return dialog?.kind === "trackChoice"
        ? { ...dialog, selection: action.selection }
        : dialog;
    case "conversionNoticeDismissalToggled":
      return dialog?.kind === "conversionNotice"
        ? { ...dialog, dismissForGood: !dialog.dismissForGood }
        : dialog;
    case "trackChoiceCancelled":
      return open.playback.noticeDue
        ? { kind: "conversionNotice", dismissForGood: true }
        : null;
    case "tracksChosen":
    case "conversionNoticeAccepted":
      return null;
    default:
      return dialog;
  }
}

type OpenPathPlayback = { mediaFileId: string; playback: PathPlayback };

function openPathPlayback(app: AppState): OpenPathPlayback | null {
  const route = mainScreenOf(app.route);
  const main = app.screen.main;
  return route.screen === "media" &&
    main.kind === "media" &&
    main.playback !== null
    ? { mediaFileId: route.mediaFileId, playback: main.playback }
    : null;
}

function settledDialog(
  dialog: DialogState,
  action: AppAction,
  open: OpenPathPlayback,
  app: AppState,
): DialogState {
  const ids = playbackRequestIds(open.mediaFileId);
  if (isSettled(action, ids.tracks, "getMediaTracks") && action.outcome.ok)
    return needsTrackChoice(
      action.outcome.data.container,
      open.playback.selection,
    )
      ? { kind: "trackChoice", selection: null, stage: "choosing" }
      : dialog;
  if (
    isSettled(action, ids.plan, "planPlayback") &&
    action.outcome.ok &&
    dialog?.kind !== "trackChoice"
  ) {
    return isConversionNoticeDue(
      action.outcome.data,
      isNoticeSettled(open.playback, app.preferences),
    )
      ? { kind: "conversionNotice", dismissForGood: true }
      : dialog;
  }
  return dialog;
}
