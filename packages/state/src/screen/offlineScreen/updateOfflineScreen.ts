import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { OfflineScreenState } from "../screenState.ts";

const parseRequestId = "offline/parseTimedText";

/** Parses a picked subtitles file and keeps its cues, or the failure, for the offline screen to show. */
export function updateOfflineScreen(
  screen: OfflineScreenState,
  action: AppAction,
): readonly [OfflineScreenState, readonly Effect[]] {
  switch (action.type) {
    case "subtitleFileChosen":
      return [
        { ...screen, cues: [], hasFailed: false, parsing: true },
        [
          {
            type: "sendRequest",
            id: parseRequestId,
            request: {
              kind: "parseTimedText",
              request: { source: action.file.source, format: null },
            },
          },
        ],
      ];
    case "requestSettled":
      // A parse that settles after the screen was left belongs to a screen that is gone.
      if (
        !screen.parsing ||
        !isSettled(action, parseRequestId, "parseTimedText")
      )
        return [screen, []];
      return [
        action.outcome.ok
          ? { ...screen, cues: action.outcome.data.cues, parsing: false }
          : { ...screen, hasFailed: true, parsing: false },
        [],
      ];
    default:
      return [screen, []];
  }
}
