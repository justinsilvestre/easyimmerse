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
        { ...screen, cues: [], hasFailed: false },
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
      if (!isSettled(action, parseRequestId, "parseTimedText"))
        return [screen, []];
      return [
        action.outcome.ok
          ? { ...screen, cues: action.outcome.data.cues }
          : { ...screen, hasFailed: true },
        [],
      ];
    default:
      return [screen, []];
  }
}
