import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { ScreenState } from "../screenState.ts";
import { isConversionNoticeDue, isNoticeSettled } from "./conversionNotice.ts";
import { selectMediaScreen } from "./mediaScreenSelectors.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { needsTrackChoice } from "./playbackMethodRules.ts";
import { playbackRequestIds } from "./playbackRequests.ts";

type DialogState = ScreenState["dialog"];

/** The slices of the app state that the playback rules read: the shown media screen and the preferences. */
export type PlaybackApp = Pick<AppState, "route" | "screen" | "preferences">;

/**
 * Opens the track choice before the first play when a kind has several tracks and no choice is saved, or when the user asks,
 * and the conversion notice when the playback method re-encodes a track and the user has not settled the notice;
 * a notice that comes due while the track choice is open waits until the choice is cancelled.
 * Keeps what each dialog shows until it closes. `app` is the state before the action.
 */
export function updatePlaybackDialog(
  dialog: DialogState,
  action: AppAction,
  app: PlaybackApp,
): DialogState {
  const open = selectOpenPathPlayback(app);
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

function selectOpenPathPlayback(
  app: Pick<AppState, "route" | "screen">,
): OpenPathPlayback | null {
  const open = selectMediaScreen(app);
  const playback = open?.screen.playback ?? null;
  return open && playback
    ? { mediaFileId: open.route.mediaFileId, playback }
    : null;
}

function settledDialog(
  dialog: DialogState,
  action: AppAction,
  open: OpenPathPlayback,
  app: PlaybackApp,
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
    isSettled(action, ids.method, "choosePlaybackMethod") &&
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
